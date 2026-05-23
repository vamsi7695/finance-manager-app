package com.financemanager.repository;

import com.financemanager.model.RecurringExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RecurringExpenseRepository extends JpaRepository<RecurringExpense, String> {
    List<RecurringExpense> findByUserIdOrderByStartDateDesc(String userId);
    List<RecurringExpense> findByHomeIdOrderByStartDateDesc(String homeId);
    List<RecurringExpense> findByActiveTrue();
}
