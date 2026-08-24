package net.sosyge.formflow.service;

import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.config.UploadProperties;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

/**
 * 파일시스템 기반 업로드 저장소. 이미지(PNG/JPG/WebP/GIF)만 허용하고 랜덤 파일명으로 저장한다.
 * SVG 는 스크립트 삽입(저장형 XSS) 위험이라 제외한다. GIF 는 스크립트 실행이 불가능해 허용한다.
 *
 * <p>디렉토리 생성 실패는 <b>앱 시작을 막지 않는다</b> — 업로드 시점에만 오류를 낸다.
 * (UPLOAD_DIR 미설정/권한 문제로 전체 서비스가 죽는 것을 방지.)
 */
@Slf4j
@Service
public class FileStorageService {

    /** 허용 MIME → 확장자. 이 목록에 없으면 거부. */
    private static final Map<String, String> ALLOWED = Map.of(
            "image/png", ".png",
            "image/jpeg", ".jpg",
            "image/webp", ".webp",
            "image/gif", ".gif"
    );

    private final Path root;
    private final long maxBytes;

    public FileStorageService(UploadProperties props) {
        this.root = Paths.get(props.getDir()).toAbsolutePath().normalize();
        this.maxBytes = props.getMaxSizeBytes();
        // 시작 시엔 시도만 하고, 실패해도 예외를 삼킨다(앱 부팅 유지). 실제 보장은 업로드 시 ensureDir.
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            log.warn("[UPLOAD] 시작 시 업로드 디렉토리 생성 실패(업로드 시 재시도): {} - {}", root, e.getMessage());
        }
    }

    /** 업로드 직전 디렉토리 보장. 실패 시 업로드만 500(앱은 계속 동작). */
    private void ensureDir() {
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            log.error("[UPLOAD] 업로드 디렉토리 생성 실패: {}", root, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "이미지 저장소를 사용할 수 없습니다.");
        }
    }

    /** 이미지 저장 후 파일명 반환. 검증 실패 시 400. */
    public String storeImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "이미지 파일이 비어 있습니다.");
        }
        if (file.getSize() > maxBytes) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "이미지는 " + (maxBytes / 1024 / 1024) + "MB 이하만 업로드할 수 있습니다.");
        }
        String ext = ALLOWED.get(file.getContentType());
        if (ext == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "PNG, JPG, WebP, GIF 이미지만 업로드할 수 있습니다.");
        }
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;
        Path target = root.resolve(filename).normalize();
        if (!target.getParent().equals(root)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "잘못된 파일 경로입니다.");
        }
        ensureDir();
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "파일 저장에 실패했습니다.");
        }
        return filename;
    }

    /** URL(…/uploads/{name}) 또는 파일명 기준으로 삭제. 없으면 조용히 무시. */
    public void deleteByUrl(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        String name = url.substring(url.lastIndexOf('/') + 1);
        if (name.isBlank()) {
            return;
        }
        Path target = root.resolve(name).normalize();
        if (!target.getParent().equals(root)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // 정리 실패는 치명적이지 않음(고아 파일). 로깅 생략.
        }
    }
}
