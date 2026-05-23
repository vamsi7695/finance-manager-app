package com.financemanager.controller;

import com.financemanager.model.User;
import com.financemanager.repository.UserRepository;
import com.financemanager.service.EncryptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/security")
public class SecurityController {

    private final UserRepository userRepository;
    private final EncryptionService encryptionService;

    public SecurityController(UserRepository userRepository, EncryptionService encryptionService) {
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
    }

    @GetMapping("/status")
    public ResponseEntity<?> getSecurityStatus(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of(
                "encryptionMethod", user.getEncryptionMethod() != null ? user.getEncryptionMethod().name() : "NONE",
                "isSetup", user.getEncryptionMethod() != null && user.getEncryptionMethod() != User.EncryptionMethod.NONE
        ));
    }

    @PostMapping("/setup")
    public ResponseEntity<?> setupEncryption(@AuthenticationPrincipal User user,
                                             @RequestBody Map<String, String> request) {
        if (user.getEncryptionMethod() != null && user.getEncryptionMethod() != User.EncryptionMethod.NONE) {
            return ResponseEntity.badRequest().body(Map.of("error", "Encryption already configured. Cannot be changed."));
        }

        String method = request.get("method");
        if (method == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Method is required"));
        }

        String salt = encryptionService.generateSalt();
        user.setEncryptionSalt(salt);

        if ("PASSPHRASE".equalsIgnoreCase(method)) {
            String passphrase = request.get("passphrase");
            if (passphrase == null || passphrase.length() < 8) {
                return ResponseEntity.badRequest().body(Map.of("error", "Passphrase must be at least 8 characters"));
            }
            user.setEncryptionMethod(User.EncryptionMethod.PASSPHRASE);
            user.setEncryptionVerifier(encryptionService.createVerifier(passphrase, salt));
        } else if ("AUTO".equalsIgnoreCase(method)) {
            user.setEncryptionMethod(User.EncryptionMethod.AUTO);
            String autoKey = encryptionService.deriveAutoKey(user.getId());
            user.setEncryptionVerifier(encryptionService.createVerifier(autoKey, salt));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid method. Use PASSPHRASE or AUTO."));
        }

        userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "message", "Encryption configured successfully",
                "encryptionMethod", user.getEncryptionMethod().name()
        ));
    }

    @PostMapping("/unlock")
    public ResponseEntity<?> unlockWallet(@AuthenticationPrincipal User user,
                                          @RequestBody Map<String, String> request) {
        if (user.getEncryptionMethod() != User.EncryptionMethod.PASSPHRASE) {
            return ResponseEntity.badRequest().body(Map.of("error", "Wallet does not use passphrase encryption"));
        }

        String passphrase = request.get("passphrase");
        if (passphrase == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Passphrase is required"));
        }

        boolean valid = encryptionService.verifyPassphrase(passphrase, user.getEncryptionSalt(), user.getEncryptionVerifier());
        if (!valid) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid passphrase"));
        }

        return ResponseEntity.ok(Map.of(
                "unlocked", true,
                "encryptionKey", passphrase
        ));
    }
}
