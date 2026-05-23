package com.financemanager.repository;

import com.financemanager.model.HomeMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface HomeMembershipRepository extends JpaRepository<HomeMembership, String> {
    List<HomeMembership> findByUserId(String userId);
    List<HomeMembership> findByHomeId(String homeId);
    Optional<HomeMembership> findByUserIdAndHomeId(String userId, String homeId);
    boolean existsByUserIdAndHomeId(String userId, String homeId);
    @Transactional
    void deleteByHomeId(String homeId);
}
