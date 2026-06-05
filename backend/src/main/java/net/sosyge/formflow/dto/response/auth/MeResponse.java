package net.sosyge.formflow.dto.response.auth;

import net.sosyge.formflow.domain.User;

import java.time.LocalDateTime;

public record MeResponse(
        Long id,
        String email,
        String nickname,
        String role,
        String plan,
        LocalDateTime emailVerifiedAt,
        LocalDateTime createdAt
) {
    public static MeResponse from(User u) {
        return new MeResponse(
                u.getId(),
                u.getEmail(),
                u.getNickname(),
                u.getRole().name(),
                u.getPlan().name(),
                u.getEmailVerifiedAt(),
                u.getCreatedAt()
        );
    }
}
