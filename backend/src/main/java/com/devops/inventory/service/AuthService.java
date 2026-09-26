package com.devops.inventory.service;

import com.devops.inventory.config.JwtConfig;
import com.devops.inventory.dto.*;
import com.devops.inventory.entity.RefreshToken;
import com.devops.inventory.entity.User;
import com.devops.inventory.exception.ResourceNotFoundException;
import com.devops.inventory.exception.TokenRefreshException;
import com.devops.inventory.repository.RefreshTokenRepository;
import com.devops.inventory.repository.UserRepository;
import com.devops.inventory.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final JwtConfig jwtConfig;

    @Transactional
    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        String accessToken = tokenProvider.generateToken(user.getId(), user.getUsername(), user.getRole());
        String refreshTokenStr = UUID.randomUUID().toString();

        refreshTokenRepository.deleteByUser(user);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenStr)
                .expiryDate(OffsetDateTime.now().plusSeconds(jwtConfig.getRefreshExpirationMs() / 1000))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);

        UserInfoDto userInfo = UserInfoDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(jwtConfig.getExpirationMs() / 1000)
                .username(user.getUsername())
                .roles(List.of(user.getRole()))
                .user(userInfo)
                .build();
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        RefreshToken token = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new TokenRefreshException("Refresh token expired or invalid"));

        if (token.getRevoked() || token.getExpiryDate().isBefore(OffsetDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new TokenRefreshException("Refresh token expired or invalid");
        }

        User user = token.getUser();
        String newAccessToken = tokenProvider.generateToken(user.getId(), user.getUsername(), user.getRole());

        UserInfoDto userInfo = UserInfoDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(token.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtConfig.getExpirationMs() / 1000)
                .username(user.getUsername())
                .roles(List.of(user.getRole()))
                .user(userInfo)
                .build();
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        if (refreshTokenStr != null) {
            refreshTokenRepository.findByToken(refreshTokenStr).ifPresent(refreshTokenRepository::delete);
        }
    }
}
