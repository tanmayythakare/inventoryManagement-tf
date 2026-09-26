package com.devops.inventory.unit;

import com.devops.inventory.config.JwtConfig;
import com.devops.inventory.dto.AuthRequest;
import com.devops.inventory.dto.AuthResponse;
import com.devops.inventory.dto.RefreshTokenRequest;
import com.devops.inventory.entity.RefreshToken;
import com.devops.inventory.entity.User;
import com.devops.inventory.exception.TokenRefreshException;
import com.devops.inventory.repository.RefreshTokenRepository;
import com.devops.inventory.repository.UserRepository;
import com.devops.inventory.security.JwtTokenProvider;
import com.devops.inventory.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private JwtConfig jwtConfig;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("admin@example.com")
                .passwordHash("$2a$10$hashedPassword")
                .fullName("System Administrator")
                .role("ROLE_ADMIN")
                .enabled(true)
                .build();
    }

    @Test
    @DisplayName("Login with valid credentials returns tokens")
    void testLoginSuccess() {
        when(userRepository.findByUsername("admin@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("Password123!", testUser.getPasswordHash())).thenReturn(true);
        when(tokenProvider.generateToken(1L, "admin@example.com", "ROLE_ADMIN")).thenReturn("mock-access-token");
        when(jwtConfig.getRefreshExpirationMs()).thenReturn(604800000L);
        when(jwtConfig.getExpirationMs()).thenReturn(900000L);

        AuthRequest request = new AuthRequest("admin@example.com", "Password123!");
        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("mock-access-token");
        assertThat(response.getRefreshToken()).isNotNull();
        assertThat(response.getUsername()).isEqualTo("admin@example.com");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Login with invalid password throws BadCredentialsException")
    void testLoginInvalidPassword() {
        when(userRepository.findByUsername("admin@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongPassword", testUser.getPasswordHash())).thenReturn(false);

        AuthRequest request = new AuthRequest("admin@example.com", "WrongPassword");

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid username or password");
    }

    @Test
    @DisplayName("Refresh with valid token returns new access token")
    void testRefreshSuccess() {
        RefreshToken token = RefreshToken.builder()
                .id(1L)
                .token("valid-refresh-token")
                .user(testUser)
                .expiryDate(OffsetDateTime.now().plusDays(5))
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByToken("valid-refresh-token")).thenReturn(Optional.of(token));
        when(tokenProvider.generateToken(1L, "admin@example.com", "ROLE_ADMIN")).thenReturn("new-access-token");
        when(jwtConfig.getExpirationMs()).thenReturn(900000L);

        RefreshTokenRequest request = new RefreshTokenRequest("valid-refresh-token");
        AuthResponse response = authService.refreshToken(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("valid-refresh-token");
    }

    @Test
    @DisplayName("Refresh with expired token throws TokenRefreshException")
    void testRefreshExpiredToken() {
        RefreshToken token = RefreshToken.builder()
                .id(1L)
                .token("expired-token")
                .user(testUser)
                .expiryDate(OffsetDateTime.now().minusDays(1))
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(token));

        RefreshTokenRequest request = new RefreshTokenRequest("expired-token");

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(TokenRefreshException.class)
                .hasMessageContaining("expired or invalid");
    }
}
