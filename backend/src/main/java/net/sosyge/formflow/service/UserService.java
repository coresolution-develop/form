package net.sosyge.formflow.service;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.domain.User;
import net.sosyge.formflow.domain.UserStatus;
import net.sosyge.formflow.dto.response.auth.MeResponse;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.mapper.RefreshTokenMapper;
import net.sosyge.formflow.mapper.UserMapper;
import net.sosyge.formflow.security.PasswordPolicyValidator;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final RefreshTokenMapper refreshTokenMapper;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;

    @Transactional(readOnly = true)
    public MeResponse getMe(Long userId) {
        User user = userMapper.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return MeResponse.from(user);
    }

    @Transactional
    public MeResponse updateMe(Long userId, String nickname) {
        User user = userMapper.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        // 닉네임만 수정 (M2-A): 별도 매퍼 없이 status/password 외 갱신은 추후 확장
        user.setNickname(nickname);
        userMapper.updateNickname(userId, nickname);
        return MeResponse.from(userMapper.findById(userId).orElseThrow());
    }

    @Transactional
    public void updatePassword(Long userId, String currentPassword, String newPassword) {
        User user = userMapper.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        passwordPolicyValidator.validate(newPassword, user.getEmail());
        userMapper.updatePassword(userId, passwordEncoder.encode(newPassword));
        refreshTokenMapper.revokeAllByUserId(userId, LocalDateTime.now());
    }

    @Transactional
    public void deleteMe(Long userId, String password) {
        User user = userMapper.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        userMapper.updateStatus(userId, UserStatus.DELETED);
        refreshTokenMapper.revokeAllByUserId(userId, LocalDateTime.now());
    }
}
