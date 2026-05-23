package com.financemanager.repository;

import com.financemanager.model.Home;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface HomeRepository extends JpaRepository<Home, String> {
    Optional<Home> findByInviteCode(String inviteCode);
}
