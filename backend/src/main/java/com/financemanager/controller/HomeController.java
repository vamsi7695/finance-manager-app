package com.financemanager.controller;

import com.financemanager.model.Home;
import com.financemanager.model.HomeMembership;
import com.financemanager.model.User;
import com.financemanager.repository.HomeRepository;
import com.financemanager.repository.HomeMembershipRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/homes")
public class HomeController {

    private final HomeRepository homeRepository;
    private final HomeMembershipRepository membershipRepository;
    private static final SecureRandom random = new SecureRandom();

    public HomeController(HomeRepository homeRepository, HomeMembershipRepository membershipRepository) {
        this.homeRepository = homeRepository;
        this.membershipRepository = membershipRepository;
    }

    @GetMapping
    public ResponseEntity<List<HomeMembership>> getMyHomes(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(membershipRepository.findByUserId(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> createHome(@AuthenticationPrincipal User user, @RequestBody Map<String, String> request) {
        String name = request.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Home name is required"));
        }

        Home home = new Home();
        home.setName(name);
        home.setInviteCode(generateInviteCode());
        home.setCreatedBy(user.getId());
        home = homeRepository.save(home);

        HomeMembership membership = new HomeMembership();
        membership.setUser(user);
        membership.setHome(home);
        membership.setRole(HomeMembership.Role.OWNER);
        membershipRepository.save(membership);

        return ResponseEntity.ok(Map.of(
                "home", home,
                "membership", membership
        ));
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinHome(@AuthenticationPrincipal User user, @RequestBody Map<String, String> request) {
        String inviteCode = request.get("inviteCode");
        if (inviteCode == null || inviteCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invite code is required"));
        }

        return homeRepository.findByInviteCode(inviteCode.toUpperCase())
                .map(home -> {
                    if (membershipRepository.existsByUserIdAndHomeId(user.getId(), home.getId())) {
                        return ResponseEntity.badRequest().body((Object) Map.of("error", "You are already a member of this home"));
                    }

                    HomeMembership membership = new HomeMembership();
                    membership.setUser(user);
                    membership.setHome(home);
                    membership.setRole(HomeMembership.Role.MEMBER);
                    membershipRepository.save(membership);

                    return ResponseEntity.ok((Object) Map.of(
                            "home", home,
                            "membership", membership
                    ));
                })
                .orElse(ResponseEntity.badRequest().body(Map.of("error", "Invalid invite code")));
    }

    @GetMapping("/{homeId}/members")
    public ResponseEntity<?> getMembers(@AuthenticationPrincipal User user, @PathVariable String homeId) {
        if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
        }
        List<HomeMembership> memberships = membershipRepository.findByHomeId(homeId);
        List<Map<String, Object>> result = memberships.stream().map(m -> {
            User memberUser = m.getUser();
            return Map.<String, Object>of(
                "id", m.getId(),
                "role", m.getRole().name(),
                "joinedAt", m.getJoinedAt().toString(),
                "user", Map.of(
                    "id", memberUser.getId(),
                    "name", memberUser.getName(),
                    "email", memberUser.getEmail(),
                    "picture", memberUser.getPicture() != null ? memberUser.getPicture() : ""
                )
            );
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{homeId}")
    public ResponseEntity<?> getHome(@AuthenticationPrincipal User user, @PathVariable String homeId) {
        if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
        }
        return homeRepository.findById(homeId)
                .map(home -> ResponseEntity.ok((Object) home))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{homeId}")
    public ResponseEntity<?> updateHome(@AuthenticationPrincipal User user, @PathVariable String homeId, @RequestBody Map<String, String> request) {
        if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
        }
        return homeRepository.findById(homeId)
                .map(home -> {
                    if (!home.getCreatedBy().equals(user.getId())) {
                        return ResponseEntity.status(403).body((Object) Map.of("error", "Only the owner can update home settings"));
                    }
                    if (request.containsKey("name") && !request.get("name").isBlank()) {
                        home.setName(request.get("name"));
                    }
                    if (request.containsKey("currency")) {
                        home.setCurrency(request.get("currency"));
                    }
                    homeRepository.save(home);
                    return ResponseEntity.ok((Object) home);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{homeId}")
    public ResponseEntity<?> deleteHome(@AuthenticationPrincipal User user, @PathVariable String homeId) {
        if (!membershipRepository.existsByUserIdAndHomeId(user.getId(), homeId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Not a member of this home"));
        }
        return homeRepository.findById(homeId)
                .map(home -> {
                    if (!home.getCreatedBy().equals(user.getId())) {
                        return ResponseEntity.status(403).body((Object) Map.of("error", "Only the owner can delete a home"));
                    }
                    membershipRepository.deleteByHomeId(homeId);
                    homeRepository.delete(home);
                    return ResponseEntity.ok((Object) Map.of("message", "Home deleted"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private String generateInviteCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            code.append(chars.charAt(random.nextInt(chars.length())));
        }
        return code.toString();
    }
}
