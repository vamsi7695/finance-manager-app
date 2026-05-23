package com.financemanager.controller;

import com.financemanager.model.Loan;
import com.financemanager.model.User;
import com.financemanager.repository.LoanRepository;
import com.financemanager.repository.HomeMembershipRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanRepository loanRepository;
    private final HomeMembershipRepository membershipRepository;

    public LoanController(LoanRepository loanRepository, HomeMembershipRepository membershipRepository) {
        this.loanRepository = loanRepository;
        this.membershipRepository = membershipRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAll(@AuthenticationPrincipal User user,
                                    @RequestHeader(value = "X-Home-Id", required = false) String homeId) {
        if (homeId != null && !homeId.isBlank()) {
            if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
            }
            return ResponseEntity.ok(loanRepository.findByHomeId(homeId));
        }
        return ResponseEntity.ok(loanRepository.findByUserId(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User user, @RequestBody Loan loan,
                                    @RequestHeader(value = "X-Home-Id", required = false) String homeId) {
        if (homeId != null && !homeId.isBlank()) {
            if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
            }
            loan.setHomeId(homeId);
        }
        loan.setUser(user);
        return ResponseEntity.ok(loanRepository.save(loan));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Loan> update(@AuthenticationPrincipal User user, @PathVariable String id,
                                       @RequestBody Loan loan) {
        return loanRepository.findById(id)
                .filter(l -> l.getUser().getId().equals(user.getId()))
                .map(existing -> {
                    existing.setLender(loan.getLender());
                    existing.setType(loan.getType());
                    existing.setPrincipalAmount(loan.getPrincipalAmount());
                    existing.setInterestRate(loan.getInterestRate());
                    existing.setEmiAmount(loan.getEmiAmount());
                    existing.setStartDate(loan.getStartDate());
                    existing.setEndDate(loan.getEndDate());
                    existing.setOutstandingBalance(loan.getOutstandingBalance());
                    existing.setStatus(loan.getStatus());
                    return ResponseEntity.ok(loanRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal User user, @PathVariable String id) {
        return loanRepository.findById(id)
                .filter(l -> l.getUser().getId().equals(user.getId()))
                .map(loan -> {
                    loanRepository.delete(loan);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
