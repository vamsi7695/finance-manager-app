package com.financemanager.repository;

import com.financemanager.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CardRepository extends JpaRepository<Card, String> {
    List<Card> findByUserId(String userId);
    List<Card> findByHomeId(String homeId);
}
