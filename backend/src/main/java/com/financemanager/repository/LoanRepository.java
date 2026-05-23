package com.financemanager.repository;

import com.financemanager.model.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, String> {
    List<Loan> findByUserId(String userId);
    List<Loan> findByHomeId(String homeId);
}
