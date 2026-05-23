package com.financemanager.controller;

import com.financemanager.model.Loan;
import com.financemanager.model.User;
import com.financemanager.repository.LoanRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanRepository loanRepository;

    public LoanController(LoanRepository loanRepository) {
        this.loanRepository = loanRepository;
    }

    @GetMapping
    public ResponseEntity<List<Loan>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(loanRepository.findByUserId(user.getId()));
    }

    @PostMapping
    public ResponseEntity<Loan> create(@AuthenticationPrincipal User user, @RequestBody Loan loan) {
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
