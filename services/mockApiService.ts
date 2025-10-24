interface LoginResponse {
  id: string
  email: string
  role: string
  token: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Order {
  id: string
  customer: string
  amount: number
  status: string
  date: string
}

interface Product {
  id: string
  name: string
  price: number
  category: string
  brand: string
}

interface Brand {
  id: string
  name: string
  description: string
}

interface Category {
  id: string
  name: string
  description: string
}

interface Store {
  id: string
  name: string
  location: string
  phone: string
}

interface Role {
  id: string
  name: string
  permissions: string[]
}

interface TopPick {
  id: string
  productId: string
  productName: string
  rank: number
}

interface Report {
  store: string
  orders: number
  revenue: number
  date: string
}

// Simulated data storage
const mockData = {
  users: [
    { id: "user-1", name: "John Doe", email: "john@example.com", role: "user" },
    { id: "user-2", name: "Jane Smith", email: "jane@example.com", role: "admin" },
    { id: "user-3", name: "Bob Johnson", email: "bob@example.com", role: "user" },
  ],
  orders: [
    { id: "order-1", customer: "John Doe", amount: 150, status: "delivered", date: "2024-01-15" },
    { id: "order-2", customer: "Jane Smith", amount: 280, status: "shipped", date: "2024-01-16" },
    { id: "order-3", customer: "Bob Johnson", amount: 95, status: "pending", date: "2024-01-17" },
  ],
  products: [
    { id: "prod-1", name: "Classic Burger", price: 12.99, category: "Burgers", brand: "Premium" },
    { id: "prod-2", name: "Cheese Burger", price: 14.99, category: "Burgers", brand: "Premium" },
    { id: "prod-3", name: "Fries", price: 4.99, category: "Sides", brand: "Standard" },
  ],
  brands: [
    { id: "brand-1", name: "Premium", description: "Premium quality products" },
    { id: "brand-2", name: "Standard", description: "Standard quality products" },
  ],
  categories: [
    { id: "cat-1", name: "Burgers", description: "Delicious burgers" },
    { id: "cat-2", name: "Sides", description: "Side dishes" },
  ],
  stores: [
    { id: "store-1", name: "Downtown Store", location: "Main St", phone: "555-0001" },
    { id: "store-2", name: "Mall Store", location: "Shopping Mall", phone: "555-0002" },
  ],
  roles: [
    { id: "role-1", name: "Admin", permissions: ["read", "write", "delete"] },
    { id: "role-2", name: "User", permissions: ["read"] },
  ],
  topPicks: [
    { id: "pick-1", productId: "prod-1", productName: "Classic Burger", rank: 1 },
    { id: "pick-2", productId: "prod-2", productName: "Cheese Burger", rank: 2 },
  ],
}

// Helper function to generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Helper function to simulate API delay
function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const mockApiService = {
  // Authentication
  async login(email: string, password: string): Promise<LoginResponse> {
    await delay()
    if (email === "admin@example.com" && password === "password123") {
      return {
        id: "admin-1",
        email,
        role: "super-admin",
        token: "mock-token-" + Date.now(),
      }
    }
    throw new Error("Invalid credentials")
  },

  // Users
  async getUsers(): Promise<User[]> {
    await delay()
    return mockData.users
  },

  async createUser(data: Partial<User>): Promise<User> {
    await delay()
    const newUser: User = {
      id: generateId("user"),
      name: data.name || "",
      email: data.email || "",
      role: data.role || "user",
    }
    mockData.users.push(newUser)
    return newUser
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    await delay()
    const user = mockData.users.find((u) => u.id === id)
    if (!user) throw new Error("User not found")
    Object.assign(user, data)
    return user
  },

  async deleteUser(id: string): Promise<void> {
    await delay()
    const idx = mockData.users.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error("User not found")
    mockData.users.splice(idx, 1)
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    await delay()
    return mockData.orders
  },

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    await delay()
    const order = mockData.orders.find((o) => o.id === id)
    if (!order) throw new Error("Order not found")
    order.status = status
    return order
  },

  async refundOrder(id: string, type: "full" | "partial"): Promise<void> {
    await delay()
    const order = mockData.orders.find((o) => o.id === id)
    if (!order) throw new Error("Order not found")
    order.status = type === "full" ? "refunded" : "partially-refunded"
  },

  // Products
  async getProducts(): Promise<Product[]> {
    await delay()
    return mockData.products
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    await delay()
    const newProduct: Product = {
      id: generateId("prod"),
      name: data.name || "",
      price: data.price || 0,
      category: data.category || "",
      brand: data.brand || "",
    }
    mockData.products.push(newProduct)
    return newProduct
  },

  async deleteProduct(id: string): Promise<void> {
    await delay()
    const idx = mockData.products.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error("Product not found")
    mockData.products.splice(idx, 1)
  },

  // Brands
  async getBrands(): Promise<Brand[]> {
    await delay()
    return mockData.brands
  },

  async createBrand(data: Partial<Brand>): Promise<Brand> {
    await delay()
    const newBrand: Brand = {
      id: generateId("brand"),
      name: data.name || "",
      description: data.description || "",
    }
    mockData.brands.push(newBrand)
    return newBrand
  },

  async updateBrand(id: string, data: Partial<Brand>): Promise<Brand> {
    await delay()
    const brand = mockData.brands.find((b) => b.id === id)
    if (!brand) throw new Error("Brand not found")
    Object.assign(brand, data)
    return brand
  },

  async deleteBrand(id: string): Promise<void> {
    await delay()
    const idx = mockData.brands.findIndex((b) => b.id === id)
    if (idx === -1) throw new Error("Brand not found")
    mockData.brands.splice(idx, 1)
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    await delay()
    return mockData.categories
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    await delay()
    const newCategory: Category = {
      id: generateId("cat"),
      name: data.name || "",
      description: data.description || "",
    }
    mockData.categories.push(newCategory)
    return newCategory
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    await delay()
    const category = mockData.categories.find((c) => c.id === id)
    if (!category) throw new Error("Category not found")
    Object.assign(category, data)
    return category
  },

  async deleteCategory(id: string): Promise<void> {
    await delay()
    const idx = mockData.categories.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error("Category not found")
    mockData.categories.splice(idx, 1)
  },

  // Stores
  async getStores(): Promise<Store[]> {
    await delay()
    return mockData.stores
  },

  async createStore(data: Partial<Store>): Promise<Store> {
    await delay()
    const newStore: Store = {
      id: generateId("store"),
      name: data.name || "",
      location: data.location || "",
      phone: data.phone || "",
    }
    mockData.stores.push(newStore)
    return newStore
  },

  // Roles
  async getRoles(): Promise<Role[]> {
    await delay()
    return mockData.roles
  },

  async deleteRole(id: string): Promise<void> {
    await delay()
    const idx = mockData.roles.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error("Role not found")
    mockData.roles.splice(idx, 1)
  },

  // Top Picks
  async getTopPicks(): Promise<TopPick[]> {
    await delay()
    return mockData.topPicks
  },

  async addTopPick(productId: string, rank: number): Promise<TopPick> {
    await delay()
    const product = mockData.products.find((p) => p.id === productId)
    if (!product) throw new Error("Product not found")
    const newPick: TopPick = {
      id: generateId("pick"),
      productId,
      productName: product.name,
      rank,
    }
    mockData.topPicks.push(newPick)
    return newPick
  },

  async removeTopPick(id: string): Promise<void> {
    await delay()
    const idx = mockData.topPicks.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error("Top pick not found")
    mockData.topPicks.splice(idx, 1)
  },

  // Reports
  async getReports(): Promise<Report[]> {
    await delay()
    return [
      { store: "Downtown Store", orders: 45, revenue: 1250, date: "2024-01-17" },
      { store: "Mall Store", orders: 32, revenue: 890, date: "2024-01-17" },
      { store: "Downtown Store", orders: 38, revenue: 1050, date: "2024-01-16" },
      { store: "Mall Store", orders: 28, revenue: 750, date: "2024-01-16" },
    ]
  },
}
