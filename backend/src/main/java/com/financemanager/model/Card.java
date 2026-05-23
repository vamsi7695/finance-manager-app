package com.financemanager.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Entity
@Table(name = "cards")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Card {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 1024)
    private String cardNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CardType cardType;

    @Column(nullable = false, length = 1024)
    private String bankName;

    @Column(nullable = false, length = 1024)
    private String expiryDate;

    @Column(nullable = false, length = 1024)
    private String cardHolderName;

    private String lastFourDigits;

    @Column(nullable = false)
    private boolean encrypted = false;

    @Column(name = "home_id")
    private String homeId;

    @OneToMany(mappedBy = "card", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Perk> perks;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public enum CardType {
        CREDIT, DEBIT
    }
}
