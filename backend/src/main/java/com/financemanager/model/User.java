package com.financemanager.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    private String picture;

    @Column(nullable = false)
    private String googleId;

    @Enumerated(EnumType.STRING)
    private EncryptionMethod encryptionMethod;

    @Column(length = 512)
    private String encryptionSalt;

    @Column(length = 512)
    private String encryptionVerifier;

    public enum EncryptionMethod {
        NONE, PASSPHRASE, AUTO
    }
}
