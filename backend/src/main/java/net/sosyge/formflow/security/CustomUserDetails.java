package net.sosyge.formflow.security;

import lombok.Getter;
import net.sosyge.formflow.domain.User;
import net.sosyge.formflow.domain.UserRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/** SecurityContext에 담기는 인증 주체. JWT 클레임 또는 DB User에서 생성. */
@Getter
public class CustomUserDetails implements UserDetails {

    private final Long id;
    private final String email;
    private final String password;
    private final UserRole role;

    private CustomUserDetails(Long id, String email, String password, UserRole role) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.role = role;
    }

    /** DB User로부터 생성 (UserDetailsService 경로). */
    public static CustomUserDetails from(User user) {
        return new CustomUserDetails(user.getId(), user.getEmail(), user.getPassword(), user.getRole());
    }

    /** JWT 클레임으로부터 생성 (필터 경로, 비밀번호 없음). */
    public static CustomUserDetails of(Long id, String email, UserRole role) {
        return new CustomUserDetails(id, email, null, role);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
