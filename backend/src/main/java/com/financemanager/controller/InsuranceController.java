package com.financemanager.controller;

import com.financemanager.model.Insurance;
import com.financemanager.model.User;
import com.financemanager.repository.InsuranceRepository;
import com.financemanager.repository.HomeMembershipRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/insurance")
public class InsuranceController {

    private final InsuranceRepository insuranceRepository;
    private final HomeMembershipRepository membershipRepository;

    public InsuranceController(InsuranceRepository insuranceRepository, HomeMembershipRepository membershipRepository) {
        this.insuranceRepository = insuranceRepository;
        this.membershipRepository = membershipRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAll(@AuthenticationPrincipal User user,
                                    @RequestHeader(value = "X-Home-Id", required = false) String homeId) {
        if (homeId != null && !homeId.isBlank()) {
            if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
            }
            return ResponseEntity.ok(insuranceRepository.findByHomeId(homeId));
        }
        return ResponseEntity.ok(insuranceRepository.findByUserId(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal User user, @RequestBody Insurance insurance,
                                    @RequestHeader(value = "X-Home-Id", required = false) String homeId) {
        if (homeId != null && !homeId.isBlank()) {
            if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
            }
            insurance.setHomeId(homeId);
        }
        insurance.setUser(user);
        return ResponseEntity.ok(insuranceRepository.save(insurance));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Insurance> update(@AuthenticationPrincipal User user, @PathVariable String id,
                                            @RequestBody Insurance insurance) {
        return insuranceRepository.findById(id)
                .filter(i -> i.getUser().getId().equals(user.getId()))
                .map(existing -> {
                    existing.setProvider(insurance.getProvider());
                    existing.setPolicyNumber(insurance.getPolicyNumber());
                    existing.setType(insurance.getType());
                    existing.setPremium(insurance.getPremium());
                    existing.setCoverageAmount(insurance.getCoverageAmount());
                    existing.setStartDate(insurance.getStartDate());
                    existing.setEndDate(insurance.getEndDate());
                    existing.setStatus(insurance.getStatus());
                    return ResponseEntity.ok(insuranceRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal User user, @PathVariable String id) {
        return insuranceRepository.findById(id)
                .filter(i -> i.getUser().getId().equals(user.getId()))
                .map(insurance -> {
                    insuranceRepository.delete(insurance);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
