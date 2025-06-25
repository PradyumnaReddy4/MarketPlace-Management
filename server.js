// Add this at the top of your server.js
const logger = {
    error: (message, error) => {
        console.error(`[ERROR] ${message}`, error);
        // In production, you might want to log to a file or service
    },
    info: (message) => {
        console.log(`[INFO] ${message}`);
    }
};

// Then in your routes, use:
try {
    // your code
} catch (error) {
    logger.error('Failed to fetch seller orders', error);
    res.status(500).json({ 
        success: false,
        message: 'Error fetching orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}
const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:8080' }));
app.use(express.json());
app.use(express.static(__dirname + '/public'));

// MySQL Connection using Sequelize
const sequelize = new Sequelize('mysql://root:2580@localhost:3306/ecommerce', {
    dialect: 'mysql',
    logging: false
});

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Connected to MySQL');
    })
    .catch(err => {
        console.error('MySQL connection error:', err);
    });

// JWT Configuration
const JWT_SECRET = 'your_jwt_secret';
const JWT_EXPIRES_IN = '1h';

// Middleware to Verify JWT Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Role Checking Middleware
const checkRole = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: `Access denied. Required role: ${roles.join(', ')}` });
    }
    next();
};

// Define Models
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    roles: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, {
    tableName: 'users',
    timestamps: false
});

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        get() {
            const value = this.getDataValue('price');
            return value === null ? null : parseFloat(value);
        }
    },
    image: {
        type: DataTypes.STRING,
        defaultValue: '/images/placeholder.jpg'
    },
    seller_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'products',
    timestamps: false
});

const CartItem = sequelize.define('CartItem', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'cart_items',
    timestamps: false
});

const Chat = sequelize.define('Chat', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    receiver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
}, {
    tableName: 'chat',
    timestamps: false
});

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    buyer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    seller_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending',
        validate: {
            isIn: {
                args: [['pending', 'paid', 'shipped', 'delivered', 'cancelled']],
                msg: 'Invalid status value'
            }
        }
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    payment_method: {
        type: DataTypes.STRING,
        allowNull: false
    },
    transaction_id: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'orders',
    timestamps: false,
    hooks: {
        beforeUpdate: async (order, options) => {
            const validTransitions = {
                pending: ['paid', 'cancelled'],
                paid: ['shipped', 'cancelled'],
                shipped: ['delivered', 'cancelled'],
                delivered: [],
                cancelled: []
            };
            
            if (!validTransitions[order.previous('status')]?.includes(order.status)) {
                throw new Error(`Invalid status transition from ${order.previous('status')} to ${order.status}`);
            }
        }
    }
});

const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'id'
        }
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    tableName: 'order_items',
    timestamps: false
});

// Define Relationships
User.hasMany(Product, { foreignKey: 'seller_id' });
Product.belongsTo(User, { foreignKey: 'seller_id' });

User.hasMany(CartItem, { foreignKey: 'user_id' });
Product.hasMany(CartItem, { foreignKey: 'product_id' });
CartItem.belongsTo(User, { foreignKey: 'user_id' });
CartItem.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(Chat, { as: 'SentMessages', foreignKey: 'sender_id' });
User.hasMany(Chat, { as: 'ReceivedMessages', foreignKey: 'receiver_id' });
Chat.belongsTo(User, { as: 'Sender', foreignKey: 'sender_id' });
Chat.belongsTo(User, { as: 'Receiver', foreignKey: 'receiver_id' });

Product.hasMany(Chat, { foreignKey: 'product_id' });
Chat.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(Order, { foreignKey: 'buyer_id', as: 'BuyerOrders' });
User.hasMany(Order, { foreignKey: 'seller_id', as: 'SellerOrders' });
Order.belongsTo(User, { foreignKey: 'buyer_id', as: 'Buyer' });
Order.belongsTo(User, { foreignKey: 'seller_id', as: 'Seller' });
Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(OrderItem, { foreignKey: 'product_id' });

// Sync the models with the database
sequelize.sync({ force: false })
    .then(() => {
        console.log('Database tables synced');
    })
    .catch(err => {
        console.error('Database sync error:', err);
    });

// Routes

// Signup Route
app.post('/signup', async (req, res) => {
    const { username, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            roles: Array.isArray(role) ? role : [role]
        });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error registering user: ' + error.message });
    }
});

// Login Rout
// Login Route
app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        // Input validation
        if (!email || !password || !role) {
            return res.status(400).json({ 
                success: false,
                message: 'Email, password, and role are required' 
            });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Check if the user has the selected role
        if (!user.roles.includes(role)) {
            return res.status(403).json({ 
                success: false,
                message: `User does not have the role: ${role}` 
            });
        }

        // Create token payload
        const tokenPayload = { 
            id: user.id, 
            username: user.username,
            email: user.email,
            role: role  // Using the selected role
        };

        // Generate JWT
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Successful response
        res.status(200).json({ 
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    roles: user.roles
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error logging in: ' + error.message 
        });
    }
});

// Product Routes
app.get('/products', authenticateToken, async (req, res) => {
    try {
        const products = await Product.findAll();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products: ' + error.message });
    }
});

app.post('/products', authenticateToken, checkRole(['seller']), async (req, res) => {
    const { name, price, image } = req.body;
    const seller_id = req.user.id;

    try {
        const product = await Product.create({ name, price, image, seller_id });
        res.status(201).json({ message: 'Product added successfully', product });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product: ' + error.message });
    }
});

app.delete('/products/:id', authenticateToken, checkRole(['seller']), async (req, res) => {
    const productId = req.params.id;

    try {
        await Chat.destroy({ where: { product_id: productId } });

        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.seller_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized: You can only delete your own products' });
        }

        await product.destroy();
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product: ' + error.message });
    }
});

app.get('/seller/products/:sellerId', authenticateToken, checkRole(['seller']), async (req, res) => {
    if (req.user.id != req.params.sellerId) {
        return res.status(403).json({ message: 'Unauthorized: Sellers can only view their own products' });
    }

    try {
        const products = await Product.findAll({ where: { seller_id: req.params.sellerId } });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching seller products: ' + error.message });
    }
});

// Cart Routes
app.post('/cart', authenticateToken, checkRole(['buyer']), async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let cartItem = await CartItem.findOne({
            where: { user_id: userId, product_id: productId }
        });

        if (cartItem) {
            cartItem.quantity += quantity;
            await cartItem.save();
        } else {
            cartItem = await CartItem.create({
                user_id: userId,
                product_id: productId,
                quantity
            });
        }

        res.status(201).json({ message: 'Product added to cart' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding to cart: ' + error.message });
    }
});

app.get('/cart', authenticateToken, checkRole(['buyer']), async (req, res) => {
    try {
        const userId = req.user.id;
        const cartItems = await CartItem.findAll({
            where: { user_id: userId },
            include: [{ model: Product, attributes: ['id', 'name', 'price', 'image'] }]
        });
        res.json(cartItems);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart items: ' + error.message });
    }
});

app.delete('/cart/:id', authenticateToken, checkRole(['buyer']), async (req, res) => {
    const cartItemId = req.params.id;
    const userId = req.user.id;

    try {
        const cartItem = await CartItem.findOne({
            where: { id: cartItemId, user_id: userId }
        });

        if (!cartItem) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        await cartItem.destroy();
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing item from cart: ' + error.message });
    }
});

// Chat Routes
app.post('/chat', authenticateToken, async (req, res) => {
    const { receiver_id, product_id, message } = req.body;
    const sender_id = req.user.id;

    try {
        const chatMessage = await Chat.create({ sender_id, receiver_id, product_id, message });
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending message: ' + error.message });
    }
});

app.get('/chat/:senderId/:receiverId/:productId', authenticateToken, async (req, res) => {
    const { senderId, receiverId, productId } = req.params;

    if (req.user.id != senderId && req.user.id != receiverId) {
        return res.status(403).json({ message: 'Unauthorized: You can only view your own chats' });
    }

    try {
        const messages = await Chat.findAll({
            where: {
                [Op.or]: [
                    { sender_id: senderId, receiver_id: receiverId, product_id: productId },
                    { sender_id: receiverId, receiver_id: senderId, product_id: productId }
                ]
            },
            order: [['timestamp', 'ASC']]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages: ' + error.message });
    }
});

app.get('/seller/chats/:sellerId', authenticateToken, checkRole(['seller']), async (req, res) => {
    if (req.user.id != req.params.sellerId) {
        return res.status(403).json({ message: 'Unauthorized: Sellers can only view their own chats' });
    }

    try {
        const chats = await Chat.findAll({
            where: { receiver_id: req.params.sellerId },
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('sender_id')), 'sender_id'], 'product_id']
        });
        const chatList = chats.map(chat => ({
            buyer_id: chat.sender_id,
            product_id: chat.product_id
        }));
        res.json(chatList);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chats: ' + error.message });
    }
});

// Order Routes
app.post('/checkout', authenticateToken, checkRole(['buyer']), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { address, payment_method, transaction_id } = req.body;
        const userId = req.user.id;

        // Get cart items with product details
        const cartItems = await CartItem.findAll({
            where: { user_id: userId },
            include: [Product],
            transaction: t
        });

        if (cartItems.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Group items by seller
        const itemsBySeller = {};
        cartItems.forEach(item => {
            const sellerId = item.Product.seller_id;
            if (!itemsBySeller[sellerId]) {
                itemsBySeller[sellerId] = [];
            }
            itemsBySeller[sellerId].push(item);
        });

        // Create orders for each seller
        const orders = [];
        for (const sellerId in itemsBySeller) {
            const sellerItems = itemsBySeller[sellerId];
            const totalAmount = sellerItems.reduce((sum, item) => sum + (item.Product.price * item.quantity), 0);

            const order = await Order.create({
                buyer_id: userId,
                seller_id: sellerId,
                status: 'pending',
                total_amount: totalAmount,
                address,
                payment_method,
                transaction_id
            }, { transaction: t });

            // Create order items
            await OrderItem.bulkCreate(
                sellerItems.map(item => ({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.Product.price
                })), 
                { transaction: t }
            );

            orders.push(order);
        }

        // Clear the cart
        await CartItem.destroy({ 
            where: { user_id: userId },
            transaction: t 
        });

        await t.commit();
        
        res.status(201).json({ 
            success: true,
            message: 'Order placed successfully', 
            data: {
                orders,
                totalAmount: orders.reduce((sum, order) => sum + order.total_amount, 0),
                qrCodeUrl: '/images/payment-qr.png'
            }
        });

    } catch (error) {
        // Only rollback if transaction hasn't been committed
        if (!t.finished) {
            await t.rollback();
        }
        console.error('Checkout error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error during checkout: ' + error.message 
        });
    }
});

// Get Buyer's Orders
app.get('/buyer/orders', authenticateToken, checkRole(['buyer']), async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { buyer_id: req.user.id },
            include: [
                { 
                    model: User, 
                    as: 'Seller',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: OrderItem,
                    include: [{
                        model: Product,
                        attributes: ['id', 'name', 'price', 'image']
                    }]
                }
            ],
            order: [['id', 'DESC']]
        });

        res.json({
            success: true,
            data: orders.map(order => ({
                ...order.get({ plain: true }),
                total_amount: parseFloat(order.total_amount) || 0,
                OrderItems: order.OrderItems.map(item => ({
                    ...item.get({ plain: true }),
                    price: parseFloat(item.price) || 0,
                    Product: {
                        ...item.Product.get({ plain: true }),
                        price: parseFloat(item.Product.price) || 0
                    }
                }))
            }))
        });
    } catch (error) {
        console.error('Error fetching buyer orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders'
        });
    }
});
app.get('/buyer/orders', authenticateToken, checkRole(['buyer']), async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { buyer_id: req.user.id },
            include: [
                { model: User, as: 'Seller', attributes: ['id', 'username'] },
                { model: OrderItem, include: [Product] }
            ],
            order: [['id', 'DESC']]
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders: ' + error.message });
    }
});

// Get Seller's Orders (updated)
app.get('/seller/orders', authenticateToken, checkRole(['seller']), async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { seller_id: req.user.id },
            include: [
                { 
                    model: User, 
                    as: 'Buyer',
                    attributes: ['id', 'username', 'email']
                },
                { 
                    model: OrderItem, 
                    include: [{
                        model: Product,
                        attributes: ['id', 'name', 'price', 'image']
                    }]
                }
            ],
            order: [['id', 'DESC']]
        });

        // Ensure total_amount is properly formatted
        const formattedOrders = orders.map(order => ({
            ...order.get({ plain: true }),
            total_amount: parseFloat(order.total_amount) || 0
        }));

        res.json({
            success: true,
            data: formattedOrders
        });
    } catch (error) {
        console.error('Error fetching seller orders:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching orders: ' + error.message 
        });
    }
});

// Get Order Details
app.get('/orders/:id', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findOne({
            where: { 
                id: req.params.id,
                [Op.or]: [
                    { buyer_id: req.user.id },
                    { seller_id: req.user.id }
                ]
            },
            include: [
                { 
                    model: User, 
                    as: 'Buyer',
                    attributes: ['id', 'username', 'email']
                },
                { 
                    model: User,
                    as: 'Seller',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: OrderItem,
                    include: [{
                        model: Product,
                        attributes: ['id', 'name', 'price', 'image']
                    }]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or unauthorized'
            });
        }

        // Format amounts to ensure they're numbers
        const formattedOrder = {
            ...order.get({ plain: true }),
            total_amount: parseFloat(order.total_amount) || 0,
            OrderItems: order.OrderItems.map(item => ({
                ...item.get({ plain: true }),
                price: parseFloat(item.price) || 0,
                Product: {
                    ...item.Product.get({ plain: true }),
                    price: parseFloat(item.Product.price) || 0
                }
            }))
        };

        res.json({
            success: true,
            data: formattedOrder
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order details'
        });
    }
});

// Update Order Status
app.put('/orders/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        
        // Find the order with proper authorization
        const order = await Order.findOne({
            where: { 
                id: req.params.id,
                [Op.or]: [
                    { buyer_id: req.user.id },
                    { seller_id: req.user.id }
                ]
            }
        });

        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found or unauthorized' 
            });
        }

        // Update status
        order.status = status;
        await order.save();

        res.json({ 
            success: true,
            message: 'Order status updated successfully',
            data: {
                id: order.id,
                newStatus: status
            }
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        
        // Handle different error types
        let statusCode = 500;
        let errorMessage = 'Error updating order status';
        
        if (error.message.includes('Invalid status transition')) {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.name === 'SequelizeValidationError') {
            statusCode = 400;
            errorMessage = error.errors.map(e => e.message).join(', ');
        }

        res.status(statusCode).json({ 
            success: false,
            message: errorMessage 
        });
    }
});
// Start Server
app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});