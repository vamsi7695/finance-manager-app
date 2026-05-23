package com.financemanager.repository;

import com.financemanager.model.Insurance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InsuranceRepository extends JpaRepository<Insurance, String> {
    List<Insurance> findByUserId(String userId);
}
