package com.financemanager.controller;

import com.financemanager.model.RecurringExpense;
import com.financemanager.model.User;
import com.financemanager.repository.RecurringExpenseRepository;
import com.financemanager.repository.HomeMembershipRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recurring-expenses")
public class RecurringExpenseController {

    private final RecurringExpenseRepository recurringExpenseRepository;
    private final HomeMembershipRepository membershipRepository;

    public RecurringExpenseController(RecurringExpenseRepository recurringExpenseRepository,
                                     HomeMembershipRepository membershipRepository) {
        this.recurringExpenseRepository = recurringExpenseRepository;
        this.membershipRepository = membershipRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAll(@AuthenticationPrincipal User user,
                                    @RequestHeader(value = "X-Home-Id", required = false) String homeId) {
        if (homeId != null && !homeId.isBlank()) {
            if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
            }
            return ResponseEntity.ok(recurringExpenseRepository.findByHomeIdOrderByStartDateDesc(homeId));
        }
        return ResponseEntity.ok(recurringExpenseRepository.findByUserIdOrderByStartDateDesc(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User user, @RequestBody RecurringExpense rule,
                                    @RequestHeader(value = "X-Home-Id", required = false) String homeId) {
        if (homeId != null && !homeId.isBlank()) {
            if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
            }
            rule.setHomeId(homeId);
        }
        rule.setUser(user);
        if (rule.getActive() == null) rule.setActive(true);
        return ResponseEntity.ok(recurringExpenseRepository.save(rule));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@AuthenticationPrincipal User user, @PathVariable String id,
                                    @RequestBody RecurringExpense rule,
                                    @RequestHeader(value = "X-Home-Id", required = false) String homeId) {
        return recurringExpenseRepository.findById(id)
                .filter(e -> {
                    if (e.getHomeId() != null && homeId != null) {
                        return membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId);
                    }
                    return e.getUser().getId().equals(user.getId());
                })
                .map(existing -> {
                    existing.setLabel(rule.getLabel());
                    existing.setAmount(rule.getAmount());
                    existing.setFrequency(rule.getFrequency());
                    existing.setDayOfMonth(rule.getDayOfMonth());
                    existing.setStartDate(rule.getStartDate());
                    existing.setEndDate(rule.getEndDate());
                    existing.setCategory(rule.getCategory());
                    existing.setSubCategory(rule.getSubCategory());
                    existing.setPaymentMethod(rule.getPaymentMethod());
                    existing.setPaidBy(rule.getPaidBy());
                    existing.setDescription(rule.getDescription());
                    existing.setTags(rule.getTags());
                    existing.setMarkAsTransfer(rule.getMarkAsTransfer());
                    existing.setRewardEligibility(rule.getRewardEligibility());
                    existing.setActive(rule.getActive());
                    return ResponseEntity.ok(recurringExpenseRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal User user, @PathVariable String id,
                                    @RequestHeader(value = "X-Home-Id", required = false) String homeId) {
        return recurringExpenseRepository.findById(id)
                .filter(e -> {
                    if (e.getHomeId() != null && homeId != null) {
                        return membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId);
                    }
                    return e.getUser().getId().equals(user.getId());
                })
                .map(rule -> {
                    recurringExpenseRepository.delete(rule);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
