-- V4: Initialize stock audit log table for mathematical verification
CREATE TABLE stock_audit_log (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    quantity_delta INT NOT NULL DEFAULT 0,
    reserved_quantity_delta INT NOT NULL DEFAULT 0,
    new_quantity INT NOT NULL CHECK (new_quantity >= 0),
    new_reserved_quantity INT NOT NULL CHECK (new_reserved_quantity >= 0),
    reason VARCHAR(50) NOT NULL,
    operator VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_audit_at_least_one_delta CHECK (quantity_delta <> 0 OR reserved_quantity_delta <> 0)
);

CREATE INDEX idx_audit_product_id ON stock_audit_log(product_id);
CREATE INDEX idx_audit_order_id ON stock_audit_log(order_id);
CREATE INDEX idx_audit_created_at ON stock_audit_log(created_at);
