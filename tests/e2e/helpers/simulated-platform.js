/**
 * Simulated Platform Engine (Reference Implementation & Test Oracle)
 * Implements deterministic business logic, pessimistic row-level locking,
 * JWT authentication, mathematical audit logging, Blue/Green SSM deployment,
 * and DevSecOps compliance scanning according to ORIGINAL_REQUEST.md & PROJECT.md.
 */

const crypto = require('crypto');

class SimulatedPlatformEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.jwtSecret = 'enterprise-devops-jwt-secret-key-2026-minimum-256-bits!';
    this.users = {
      admin: {
        id: 1,
        username: 'admin',
        passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
        roles: ['ADMIN', 'USER']
      },
      user: {
        id: 2,
        username: 'user',
        passwordHash: crypto.createHash('sha256').update('user123').digest('hex'),
        roles: ['USER']
      }
    };

    this.refreshTokens = new Map();

    // Initial products matching V5__seed_initial_data.sql
    this.products = [
      {
        id: 1,
        sku: 'PROD-WIDGET-001',
        name: 'Industrial Widget',
        price: 49.99,
        quantity: 100,
        reservedQuantity: 15,
        availableQuantity: 85,
        active: true,
        version: 1
      },
      {
        id: 2,
        sku: 'PROD-GADGET-002',
        name: 'Precision Gadget',
        price: 89.99,
        quantity: 50,
        reservedQuantity: 5,
        availableQuantity: 45,
        active: true,
        version: 1
      },
      {
        id: 3,
        sku: 'PROD-EDGE-003',
        name: 'Flash Sale Device',
        price: 199.99,
        quantity: 1,
        reservedQuantity: 0,
        availableQuantity: 1,
        active: true,
        version: 1
      }
    ];

    this.orders = new Map([
      [
        101,
        {
          id: 101,
          userId: 1,
          status: 'PENDING',
          items: [{ productId: 1, quantity: 2, unitPrice: 49.99 }],
          totalAmount: 99.98,
          createdAt: new Date().toISOString()
        }
      ],
      [
        102,
        {
          id: 102,
          userId: 2,
          status: 'PENDING',
          items: [{ productId: 3, quantity: 1, unitPrice: 199.99 }],
          totalAmount: 199.99,
          createdAt: new Date().toISOString()
        }
      ],
      [
        103,
        {
          id: 103,
          userId: 1,
          status: 'PENDING',
          items: [{ productId: 3, quantity: 1, unitPrice: 199.99 }],
          totalAmount: 199.99,
          createdAt: new Date().toISOString()
        }
      ]
    ]);

    this.auditLogs = [];
    this.auditIdCounter = 1;

    this.healthStatus = {
      db: 'UP',
      diskSpace: 'UP'
    };

    // Blue/Green Deployment state
    this.deploymentState = {
      activeColor: 'blue',
      activePort: 8081,
      idlePort: 8082,
      albTargetGroup: ['i-0123456789abcdef0'],
      connectionDraining: false,
      ssmParameterStore: {
        '/inventory-api/prod/previous_image_tag': 'inventory-api:v1.0.0-prev',
        '/inventory-api/prod/current_image_tag': 'inventory-api:v1.0.1'
      },
      ecrRepository: new Set(['inventory-api:v1.0.0-prev', 'inventory-api:v1.0.1'])
    };

    // Mutex lock for simulating pessimistic database row locking
    this.productLocks = new Map();
  }

  // --- Auth & JWT Helpers ---

  signJwt(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    return `${headerB64}.${payloadB64}.${signature}`;
  }

  verifyJwt(token) {
    if (!token || typeof token !== 'string') throw new Error('MALFORMED_TOKEN');
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('MALFORMED_TOKEN');
    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    if (signature !== expectedSig) throw new Error('INVALID_SIGNATURE');

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('TOKEN_EXPIRED');
    }
    return payload;
  }

  login(username, password) {
    if (!username || !password) {
      const err = new Error('Username and password are required');
      err.status = 400;
      err.code = 'INVALID_INPUT';
      throw err;
    }

    const user = this.users[username];
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (!user || user.passwordHash !== passwordHash) {
      const err = new Error('Bad credentials');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const now = Math.floor(Date.now() / 1000);
    const accessToken = this.signJwt({
      sub: user.username,
      roles: user.roles,
      userId: user.id,
      iat: now,
      exp: now + 900 // 15 minutes
    });

    const refreshToken = crypto.randomUUID();
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      username: user.username,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000, // 7 days
      revoked: false
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      username: user.username,
      roles: user.roles
    };
  }

  refresh(refreshToken) {
    if (!refreshToken) {
      const err = new Error('Refresh token is required');
      err.status = 400;
      err.code = 'INVALID_INPUT';
      throw err;
    }

    const session = this.refreshTokens.get(refreshToken);
    if (!session || session.revoked || session.expiresAt < Date.now()) {
      const err = new Error('Refresh token expired or invalid');
      err.status = 401;
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }

    const user = this.users[session.username];
    const now = Math.floor(Date.now() / 1000);
    const newAccessToken = this.signJwt({
      sub: user.username,
      roles: user.roles,
      userId: user.id,
      iat: now,
      exp: now + 900
    });

    return {
      accessToken: newAccessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer'
    };
  }

  // --- Catalog & Pessimistic Lock Engine ---

  getProducts() {
    return this.products.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: p.price,
      quantity: p.quantity,
      reservedQuantity: p.reservedQuantity,
      availableQuantity: p.quantity - p.reservedQuantity,
      active: p.active
    }));
  }

  getProductById(id) {
    const prod = this.products.find(p => p.id === id);
    if (!prod) {
      const err = new Error(`Product not found: ${id}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return {
      id: prod.id,
      sku: prod.sku,
      name: prod.name,
      price: prod.price,
      quantity: prod.quantity,
      reservedQuantity: prod.reservedQuantity,
      availableQuantity: prod.quantity - prod.reservedQuantity,
      active: prod.active
    };
  }

  async acquireProductLock(productId) {
    while (this.productLocks.get(productId)) {
      await new Promise(res => setTimeout(res, 5));
    }
    this.productLocks.set(productId, true);
  }

  releaseProductLock(productId) {
    this.productLocks.delete(productId);
  }

  async confirmOrder(orderId) {
    const order = this.orders.get(orderId);
    if (!order) {
      const err = new Error(`Order not found: ${orderId}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (order.status !== 'PENDING') {
      const err = new Error(`Order is not in PENDING state (current: ${order.status})`);
      err.status = 400;
      err.code = 'INVALID_ORDER_STATE';
      throw err;
    }

    // Sort product items by ID ascending (ORDER BY id ASC) to eliminate deadlock
    const sortedItems = [...order.items].sort((a, b) => a.productId - b.productId);

    // Acquire locks in numerical order
    for (const item of sortedItems) {
      await this.acquireProductLock(item.productId);
    }

    try {
      // Stock verification under exclusive lock
      for (const item of sortedItems) {
        if (item.quantity <= 0) {
          const err = new Error('Order item quantity must be positive');
          err.status = 400;
          err.code = 'INVALID_QUANTITY';
          throw err;
        }

        const product = this.products.find(p => p.id === item.productId);
        if (!product) {
          const err = new Error(`Product not found: ${item.productId}`);
          err.status = 404;
          err.code = 'NOT_FOUND';
          throw err;
        }

        const available = product.quantity - product.reservedQuantity;
        if (available < item.quantity) {
          const err = new Error(`Insufficient available quantity for product SKU ${product.sku}`);
          err.status = 409;
          err.code = 'INSUFFICIENT_STOCK';
          err.productId = product.id;
          err.requested = item.quantity;
          err.available = available;
          throw err;
        }
      }

      // Atomically execute reservation & audit log insertion
      for (const item of sortedItems) {
        const product = this.products.find(p => p.id === item.productId);
        product.reservedQuantity += item.quantity;
        product.availableQuantity = product.quantity - product.reservedQuantity;

        // Mathematical Stock Audit Log
        this.auditLogs.push({
          id: this.auditIdCounter++,
          productId: product.id,
          orderId: order.id,
          operationType: 'RESERVE',
          quantityDelta: 0,
          reservedQuantityDelta: item.quantity,
          newQuantity: product.quantity,
          newReservedQuantity: product.reservedQuantity,
          createdAt: new Date().toISOString()
        });
      }

      order.status = 'CONFIRMED';
      order.confirmedAt = new Date().toISOString();

      return {
        orderId: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        confirmedAt: order.confirmedAt
      };
    } finally {
      // Always release locks in reverse order
      for (let i = sortedItems.length - 1; i >= 0; i--) {
        this.releaseProductLock(sortedItems[i].productId);
      }
    }
  }

  // --- Health Probe ---

  getHealth() {
    const isDbUp = this.healthStatus.db === 'UP';
    const isDiskUp = this.healthStatus.diskSpace === 'UP';
    const overallUp = isDbUp && isDiskUp;

    return {
      status: overallUp ? 'UP' : 'DOWN',
      httpStatus: overallUp ? 200 : 503,
      components: {
        db: {
          status: this.healthStatus.db,
          details: { database: 'PostgreSQL' }
        },
        diskSpace: {
          status: this.healthStatus.diskSpace
        }
      }
    };
  }

  setDbHealth(status) {
    this.healthStatus.db = status;
  }

  // --- Blue/Green SSM Deployment Engine ---

  async executeRollingDeployment(targetInstanceId, newImageTag) {
    const steps = [];

    // 1. Deregister from ALB
    steps.push({ step: 'ALB_DEREGISTER', status: 'INITIATED', instance: targetInstanceId });
    this.deploymentState.albTargetGroup = this.deploymentState.albTargetGroup.filter(
      id => id !== targetInstanceId
    );
    this.deploymentState.connectionDraining = true;

    // 2. Wait 15s connection drain (simulated)
    steps.push({ step: 'CONNECTION_DRAIN', durationSeconds: 15, status: 'COMPLETED' });
    this.deploymentState.connectionDraining = false;

    // 3. Determine idle port
    const nextColor = this.deploymentState.activeColor === 'blue' ? 'green' : 'blue';
    const nextPort = this.deploymentState.activePort === 8081 ? 8082 : 8081;

    // 4. Start new container on idle port & probe health
    steps.push({ step: 'START_CONTAINER', port: nextPort, color: nextColor, image: newImageTag });

    // Check if image tag is intentionally corrupted/unhealthy
    if (newImageTag.includes('unhealthy') || newImageTag.includes('corrupted')) {
      steps.push({ step: 'PROBE_HEALTH', port: nextPort, status: 'FAILED', error: 'Connection refused / health timeout' });
      // Abort deployment
      steps.push({ step: 'DEPLOYMENT_ABORTED', reason: 'Unhealthy container probe failed' });
      // Re-register original instance to ALB
      this.deploymentState.albTargetGroup.push(targetInstanceId);
      return { success: false, steps, currentPort: this.deploymentState.activePort };
    }

    steps.push({ step: 'PROBE_HEALTH', port: nextPort, status: 'UP', httpStatus: 200 });

    // 5. Atomic local Nginx proxy port switch
    this.deploymentState.activeColor = nextColor;
    this.deploymentState.activePort = nextPort;
    this.deploymentState.idlePort = nextPort === 8081 ? 8082 : 8081;
    steps.push({ step: 'NGINX_PORT_SWAP', activePort: nextPort, activeColor: nextColor });

    // 6. Stop old container
    steps.push({ step: 'STOP_OLD_CONTAINER', port: this.deploymentState.idlePort });

    // 7. Update SSM Parameter Store
    this.deploymentState.ssmParameterStore['/inventory-api/prod/previous_image_tag'] =
      this.deploymentState.ssmParameterStore['/inventory-api/prod/current_image_tag'];
    this.deploymentState.ssmParameterStore['/inventory-api/prod/current_image_tag'] = newImageTag;

    // 8. Re-register into ALB
    this.deploymentState.albTargetGroup.push(targetInstanceId);
    steps.push({ step: 'ALB_REGISTER', status: 'HEALTHY', instance: targetInstanceId });

    return { success: true, steps, activePort: this.deploymentState.activePort };
  }

  async executeRollback(targetInstanceId) {
    const prevTag = this.deploymentState.ssmParameterStore['/inventory-api/prod/previous_image_tag'];
    if (!prevTag) {
      throw new Error('NO_PREVIOUS_TAG_FOUND');
    }
    const result = await this.executeRollingDeployment(targetInstanceId, prevTag);
    return {
      rolledBackTo: prevTag,
      success: result.success,
      steps: result.steps
    };
  }

  // --- ECR Registry ---

  pushEcrImage(imageTag) {
    if (this.deploymentState.ecrRepository.has(imageTag)) {
      const err = new Error(`Image tag ${imageTag} already exists. Image tag mutability is IMMUTABLE.`);
      err.code = 'ImageAlreadyExistsException';
      err.status = 400;
      throw err;
    }
    this.deploymentState.ecrRepository.add(imageTag);
    return { status: 'PUSHED', tag: imageTag };
  }
}

module.exports = {
  SimulatedPlatformEngine
};
