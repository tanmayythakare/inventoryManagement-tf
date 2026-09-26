package com.devops.inventory.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private OffsetDateTime timestamp;
    private Integer status;
    private String error;
    private String message;
    private String code;
    private Long productId;
    private String sku;
    private Integer requested;
    private Integer available;
    private Map<String, String> errors;
}
