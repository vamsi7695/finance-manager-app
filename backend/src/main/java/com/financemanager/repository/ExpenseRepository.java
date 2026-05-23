package com.financemanager.repository;

import com.financemanager.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, String> {
    List<Expense> findByUserIdOrderByDateDesc(String userId);
}
