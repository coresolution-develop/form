package net.sosyge.formflow.service;

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
 * 파일시스템 기반 업로드 저장소. 이미지(PNG/JPG/WebP)만 허용하고 랜덤 파일명으로 저장한다.
 * SVG 는 스크립트 삽입(저장형 XSS) 위험이라 제외한다.
 */
@Service
public class FileStorageService {

    /** 허용 MIME → 확장자. 이 목록에 없으면 거부. */
    private static final Map<String, String> ALLOWED = Map.of(
            "image/png", ".png",
            "image/jpeg", ".jpg",
            "image/webp", ".webp"
    );

    private final Path root;
    private final long maxBytes;

    public FileStorageService(UploadProperties props) {
        this.root = Paths.get(props.getDir()).toAbsolutePath().normalize();
        this.maxBytes = props.getMaxSizeBytes();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException("업로드 디렉토리 생성 실패: " + root, e);
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
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "PNG, JPG, WebP 이미지만 업로드할 수 있습니다.");
        }
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;
        Path target = root.resolve(filename).normalize();
        if (!target.getParent().equals(root)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "잘못된 파일 경로입니다.");
        }
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
