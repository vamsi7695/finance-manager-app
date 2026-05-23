package com.financemanager.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Base64;

@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;
    private static final int KEY_LENGTH = 256;
    private static final int ITERATIONS = 310000;
    private static final String VERIFIER_PLAINTEXT = "FINANCE_MANAGER_VERIFIED";

    @Value("${app.encryption.server-key}")
    private String serverKey;

    private final SecureRandom secureRandom = new SecureRandom();

    public String generateSalt() {
        byte[] salt = new byte[32];
        secureRandom.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }

    public String createVerifier(String encryptionKey, String salt) {
        return encrypt(VERIFIER_PLAINTEXT, encryptionKey, salt);
    }

    public boolean verifyPassphrase(String passphrase, String salt, String storedVerifier) {
        try {
            String decrypted = decrypt(storedVerifier, passphrase, salt);
            return VERIFIER_PLAINTEXT.equals(decrypted);
        } catch (Exception e) {
            return false;
        }
    }

    public String deriveAutoKey(String userId) {
        return serverKey + ":" + userId;
    }

    public String encrypt(String plaintext, String passphrase, String salt) {
        try {
            SecretKey key = deriveKey(passphrase, Base64.getDecoder().decode(salt));
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, spec);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes("UTF-8"));

            byte[] combined = new byte[IV_LENGTH + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, IV_LENGTH);
            System.arraycopy(ciphertext, 0, combined, IV_LENGTH, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String ciphertext, String passphrase, String salt) {
        try {
            SecretKey key = deriveKey(passphrase, Base64.getDecoder().decode(salt));
            byte[] combined = Base64.getDecoder().decode(ciphertext);

            byte[] iv = new byte[IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);

            byte[] encrypted = new byte[combined.length - IV_LENGTH];
            System.arraycopy(combined, IV_LENGTH, encrypted, 0, encrypted.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, spec);

            byte[] plaintext = cipher.doFinal(encrypted);
            return new String(plaintext, "UTF-8");
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }

    private SecretKey deriveKey(String passphrase, byte[] salt) throws Exception {
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        KeySpec spec = new PBEKeySpec(passphrase.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
        byte[] keyBytes = factory.generateSecret(spec).getEncoded();
        return new SecretKeySpec(keyBytes, "AES");
    }
}
