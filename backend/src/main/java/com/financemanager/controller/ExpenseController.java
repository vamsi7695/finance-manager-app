package com.financemanager.controller;

import com.financemanager.model.Expense;
import com.financemanager.model.User;
import com.financemanager.repository.ExpenseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;

    public ExpenseController(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    @GetMapping
    public ResponseEntity<List<Expense>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(expenseRepository.findByUserIdOrderByDateDesc(user.getId()));
    }

    @PostMapping
    public ResponseEntity<Expense> create(@AuthenticationPrincipal User user, @RequestBody Expense expense) {
        expense.setUser(user);
        return ResponseEntity.ok(expenseRepository.save(expense));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Expense> update(@AuthenticationPrincipal User user, @PathVariable String id,
                                          @RequestBody Expense expense) {
        return expenseRepository.findById(id)
                .filter(e -> e.getUser().getId().equals(user.getId()))
                .map(existing -> {
                    existing.setAmount(expense.getAmount());
                    existing.setCategory(expense.getCategory());
                    existing.setDescription(expense.getDescription());
                    existing.setDate(expense.getDate());
                    existing.setPaymentMethod(expense.getPaymentMethod());
                    return ResponseEntity.ok(expenseRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal User user, @PathVariable String id) {
        return expenseRepository.findById(id)
                .filter(e -> e.getUser().getId().equals(user.getId()))
                .map(expense -> {
                    expenseRepository.delete(expense);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
