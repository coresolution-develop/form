package net.sosyge.formflow.dto.request.field;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** §7.6 필드 순서 변경. */
public record FieldOrderRequest(
        @NotEmpty @Valid List<OrderItem> orders
) {
    public record OrderItem(
            @NotNull Long fieldId,
            @NotNull Integer orderNum
    ) {}
}
