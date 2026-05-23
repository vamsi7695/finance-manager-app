package com.financemanager.service;

import com.financemanager.model.Expense;
import com.financemanager.model.RecurringExpense;
import com.financemanager.repository.ExpenseRepository;
import com.financemanager.repository.RecurringExpenseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class RecurringExpenseScheduler {

    private static final Logger log = LoggerFactory.getLogger(RecurringExpenseScheduler.class);

    private final RecurringExpenseRepository recurringRepo;
    private final ExpenseRepository expenseRepo;

    public RecurringExpenseScheduler(RecurringExpenseRepository recurringRepo, ExpenseRepository expenseRepo) {
        this.recurringRepo = recurringRepo;
        this.expenseRepo = expenseRepo;
    }

    // Runs every day at 00:05 AM
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void generateRecurringExpenses() {
        LocalDate today = LocalDate.now();
        log.info("Running recurring expense scheduler for {}", today);

        List<RecurringExpense> activeRules = recurringRepo.findByActiveTrue();

        for (RecurringExpense rule : activeRules) {
            // Skip if start date is in the future
            if (rule.getStartDate().isAfter(today)) continue;

            // Skip if end date has passed
            if (rule.getEndDate() != null && rule.getEndDate().isBefore(today)) continue;

            // Determine all dates that need generating from lastGeneratedDate+1 to today
            LocalDate fromDate = rule.getLastGeneratedDate() != null
                    ? rule.getLastGeneratedDate().plusDays(1)
                    : rule.getStartDate();

            while (!fromDate.isAfter(today)) {
                if (shouldGenerate(rule, fromDate)) {
                    createExpenseFromRule(rule, fromDate);
                }
                fromDate = fromDate.plusDays(1);
            }

            rule.setLastGeneratedDate(today);
            recurringRepo.save(rule);
        }

        log.info("Recurring expense scheduler completed. Processed {} active rules.", activeRules.size());
    }

    private boolean shouldGenerate(RecurringExpense rule, LocalDate date) {
        String freq = rule.getFrequency();
        switch (freq) {
            case "Daily":
                return true;
            case "Weekly":
                return date.getDayOfWeek().getValue() == rule.getStartDate().getDayOfWeek().getValue();
            case "Monthly":
                int targetDay = rule.getDayOfMonth() != null ? rule.getDayOfMonth() : rule.getStartDate().getDayOfMonth();
                int lastDay = date.lengthOfMonth();
                int effectiveDay = Math.min(targetDay, lastDay);
                return date.getDayOfMonth() == effectiveDay;
            case "Yearly":
                return date.getMonthValue() == rule.getStartDate().getMonthValue()
                        && date.getDayOfMonth() == rule.getStartDate().getDayOfMonth();
            default:
                return false;
        }
    }

    private void createExpenseFromRule(RecurringExpense rule, LocalDate date) {
        Expense expense = new Expense();
        expense.setAmount(rule.getAmount());
        expense.setCategory(rule.getCategory());
        expense.setSubCategory(rule.getSubCategory());
        expense.setDescription(rule.getLabel() + (rule.getDescription() != null && !rule.getDescription().isEmpty() ? " - " + rule.getDescription() : ""));
        expense.setDate(date);
        expense.setPaymentMethod(rule.getPaymentMethod());
        expense.setTags(rule.getTags());
        expense.setMarkAsTransfer(rule.getMarkAsTransfer());
        expense.setRewardEligibility(rule.getRewardEligibility());
        expense.setPaidBy(rule.getPaidBy());
        expense.setHomeId(rule.getHomeId());
        expense.setUser(rule.getUser());
        expenseRepo.save(expense);
        log.info("Created expense from rule '{}' for date {}", rule.getLabel(), date);
    }
}
