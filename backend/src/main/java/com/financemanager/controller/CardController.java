package com.financemanager.controller;

import com.financemanager.model.Card;
import com.financemanager.model.User;
import com.financemanager.repository.CardRepository;
import com.financemanager.service.EncryptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cards")
public class CardController {

    private final CardRepository cardRepository;
    private final EncryptionService encryptionService;

    public CardController(CardRepository cardRepository, EncryptionService encryptionService) {
        this.cardRepository = cardRepository;
        this.encryptionService = encryptionService;
    }

    @GetMapping
    public ResponseEntity<List<Card>> getAll(@AuthenticationPrincipal User user,
                                             @RequestHeader(value = "X-Encryption-Key", required = false) String encryptionKey) {
        List<Card> cards = cardRepository.findByUserId(user.getId());

        String key = resolveEncryptionKey(user, encryptionKey);
        if (key != null) {
            cards.forEach(card -> decryptCard(card, key, user.getEncryptionSalt()));
        }

        return ResponseEntity.ok(cards);
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User user,
                                    @RequestBody Card card,
                                    @RequestHeader(value = "X-Encryption-Key", required = false) String encryptionKey) {
        if (user.getEncryptionMethod() == null || user.getEncryptionMethod() == User.EncryptionMethod.NONE) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please setup wallet security first"));
        }

        String key = resolveEncryptionKey(user, encryptionKey);
        if (key == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Encryption key required. Please unlock your wallet."));
        }

        String lastFour = card.getCardNumber().length() >= 4
                ? card.getCardNumber().substring(card.getCardNumber().length() - 4)
                : card.getCardNumber();
        card.setLastFourDigits(lastFour);

        encryptCard(card, key, user.getEncryptionSalt());
        card.setUser(user);
        card.setEncrypted(true);

        Card saved = cardRepository.save(card);
        decryptCard(saved, key, user.getEncryptionSalt());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@AuthenticationPrincipal User user,
                                    @PathVariable String id,
                                    @RequestBody Card card,
                                    @RequestHeader(value = "X-Encryption-Key", required = false) String encryptionKey) {
        String key = resolveEncryptionKey(user, encryptionKey);
        if (key == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Encryption key required. Please unlock your wallet."));
        }

        return cardRepository.findById(id)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .map(existing -> {
                    String lastFour = card.getCardNumber().length() >= 4
                            ? card.getCardNumber().substring(card.getCardNumber().length() - 4)
                            : card.getCardNumber();
                    existing.setLastFourDigits(lastFour);

                    existing.setCardNumber(encryptionService.encrypt(card.getCardNumber(), key, user.getEncryptionSalt()));
                    existing.setCardType(card.getCardType());
                    existing.setBankName(encryptionService.encrypt(card.getBankName(), key, user.getEncryptionSalt()));
                    existing.setExpiryDate(encryptionService.encrypt(card.getExpiryDate(), key, user.getEncryptionSalt()));
                    existing.setCardHolderName(encryptionService.encrypt(card.getCardHolderName(), key, user.getEncryptionSalt()));
                    existing.setEncrypted(true);

                    Card saved = cardRepository.save(existing);
                    decryptCard(saved, key, user.getEncryptionSalt());
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal User user, @PathVariable String id) {
        return cardRepository.findById(id)
                .filter(c -> c.getUser().getId().equals(user.getId()))
                .map(card -> {
                    cardRepository.delete(card);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private String resolveEncryptionKey(User user, String headerKey) {
        if (user.getEncryptionMethod() == null || user.getEncryptionMethod() == User.EncryptionMethod.NONE) {
            return null;
        }
        if (user.getEncryptionMethod() == User.EncryptionMethod.AUTO) {
            return encryptionService.deriveAutoKey(user.getId());
        }
        return headerKey;
    }

    private void encryptCard(Card card, String key, String salt) {
        card.setCardNumber(encryptionService.encrypt(card.getCardNumber(), key, salt));
        card.setBankName(encryptionService.encrypt(card.getBankName(), key, salt));
        card.setExpiryDate(encryptionService.encrypt(card.getExpiryDate(), key, salt));
        card.setCardHolderName(encryptionService.encrypt(card.getCardHolderName(), key, salt));
    }

    private void decryptCard(Card card, String key, String salt) {
        if (!card.isEncrypted()) return;
        try {
            card.setCardNumber(encryptionService.decrypt(card.getCardNumber(), key, salt));
            card.setBankName(encryptionService.decrypt(card.getBankName(), key, salt));
            card.setExpiryDate(encryptionService.decrypt(card.getExpiryDate(), key, salt));
            card.setCardHolderName(encryptionService.decrypt(card.getCardHolderName(), key, salt));
        } catch (Exception e) {
            card.setCardNumber("**** " + card.getLastFourDigits());
            card.setBankName("[Encrypted]");
            card.setExpiryDate("[Encrypted]");
            card.setCardHolderName("[Encrypted]");
        }
    }
}
