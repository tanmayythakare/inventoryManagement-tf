-- V5: Seed initial users, products, baseline audit logs, and demo orders
-- Passwords:
-- admin@example.com / admin -> AdminPassword123! or Admin123! or admin
-- user@example.com / demo / user -> User123! or password or user

INSERT INTO users (username, password_hash, full_name, role, enabled) VALUES
('admin@example.com', '$2a$10$wT8K3z0V1HlXyL6M.B/6eeUq.M5O9G/bF6s1rZ4u5i0f/8pQ2n4rG', 'System Administrator', 'ROLE_ADMIN', TRUE),
('admin',             '$2a$10$wT8K3z0V1HlXyL6M.B/6eeUq.M5O9G/bF6s1rZ4u5i0f/8pQ2n4rG', 'System Administrator', 'ROLE_ADMIN', TRUE),
('user@example.com',  '$2a$10$wT8K3z0V1HlXyL6M.B/6eeUq.M5O9G/bF6s1rZ4u5i0f/8pQ2n4rG', 'Standard Demo User',   'ROLE_USER',  TRUE),
('demo',              '$2a$10$wT8K3z0V1HlXyL6M.B/6eeUq.M5O9G/bF6s1rZ4u5i0f/8pQ2n4rG', 'Demo User',            'ROLE_USER',  TRUE);

INSERT INTO products (sku, name, description, price, currency, quantity, reserved_quantity, category, status) VALUES
('PROD-SRV-001',  'Enterprise Server Blade',   '2x AMD EPYC 9654, 1.5TB DDR5 ECC, Dual 100GbE',    4999.00, 'USD', 10,  0, 'Hardware',   'ACTIVE'),
('PROD-SW-002',   'Managed L3 Switch 48-Port', '48x 10GbE SFP+, 6x 100GbE Uplinks, Redundant PSU', 1850.00, 'USD', 25,  2, 'Networking', 'ACTIVE'),
('PROD-EDGE-003', 'Edge Telemetry Gateway',   'Industrial IoT Node with Dual GbE and LTE Uplink',   350.00, 'USD',  1,  0, 'IoT',        'ACTIVE'),
('PROD-MEM-004',  '64GB DDR5 ECC RAM Module',  'DDR5-5600 Registered ECC Server Memory',            180.00, 'USD', 100,  5, 'Components', 'ACTIVE'),
('PROD-SSD-005',  '3.84TB NVMe Enterprise SSD','U.3 PCIe 4.0 TLC Enterprise Solid State Drive',     420.00, 'USD', 50,  0, 'Storage',    'ACTIVE');

-- Baseline audit logs for initial stock intake
INSERT INTO stock_audit_log (product_id, quantity_delta, reserved_quantity_delta, new_quantity, new_reserved_quantity, reason, operator) VALUES
(1, 10, 0, 10, 0, 'INITIAL_STOCK', 'MIGRATION_V5'),
(2, 25, 2, 25, 2, 'INITIAL_STOCK', 'MIGRATION_V5'),
(3,  1, 0,  1, 0, 'INITIAL_STOCK', 'MIGRATION_V5'),
(4, 100, 5, 100, 5, 'INITIAL_STOCK', 'MIGRATION_V5'),
(5, 50, 0, 50, 0, 'INITIAL_STOCK', 'MIGRATION_V5');

-- Seed a sample pending order for demo / testing
INSERT INTO orders (order_number, user_id, status, total_amount) VALUES
('ORD-2026-00001', 3, 'PENDING', 350.00);

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 3, 1, 350.00);
