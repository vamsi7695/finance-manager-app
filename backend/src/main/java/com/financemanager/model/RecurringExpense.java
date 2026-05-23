package com.financemanager.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "recurring_expenses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecurringExpense {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String frequency; // DAILY, WEEKLY, MONTHLY, YEARLY

    private Integer dayOfMonth;

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    @Column(nullable = false)
    private String category;

    private String subCategory;

    private String paymentMethod;

    private String paidBy;

    private String description;

    private String tags;

    private Boolean markAsTransfer;

    private String rewardEligibility;

    private Boolean active;

    private LocalDate lastGeneratedDate;

    @Column(name = "home_id")
    private String homeId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
