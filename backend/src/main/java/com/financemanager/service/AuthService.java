package com.financemanager.service;

import com.financemanager.model.User;
import com.financemanager.repository.UserRepository;
import com.financemanager.security.JwtTokenProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final GoogleIdTokenVerifier verifier;

    public AuthService(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
                       @Value("${google.client.id}") String googleClientId) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    public Map<String, Object> authenticateWithGoogle(String credential) {
        try {
            GoogleIdToken idToken = verifier.verify(credential);
            if (idToken == null) {
                throw new RuntimeException("Invalid Google token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");

            User user = userRepository.findByGoogleId(googleId)
                    .orElseGet(() -> {
                        User newUser = new User();
                        newUser.setGoogleId(googleId);
                        newUser.setEmail(email);
                        newUser.setName(name);
                        newUser.setPicture(picture);
                        return userRepository.save(newUser);
                    });

            // Update user info on each login
            user.setName(name);
            user.setPicture(picture);
            userRepository.save(user);

            String token = jwtTokenProvider.generateToken(user.getId());

            return Map.of(
                    "token", token,
                    "user", Map.of(
                            "id", user.getId(),
                            "email", user.getEmail(),
                            "name", user.getName(),
                            "picture", user.getPicture()
                    )
            );
        } catch (Exception e) {
            throw new RuntimeException("Google authentication failed: " + e.getMessage());
        }
    }
}
