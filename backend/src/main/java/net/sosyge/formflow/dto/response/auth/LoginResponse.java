package net.sosyge.formflow.dto.response.auth;

import net.sosyge.formflow.domain.User;

public record LoginResponse(
        String accessToken,
        UserSummary user
) {
    public record UserSummary(
            Long id,
            String email,
            String nickname,
            String role
    ) {}

    public static LoginResponse of(String accessToken, User u) {
        return new LoginResponse(
                accessToken,
                new UserSummary(u.getId(), u.getEmail(), u.getNickname(), u.getRole().name())
        );
    }
}
