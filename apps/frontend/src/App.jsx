import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL

function App() {
const [formData, setFormData] = useState({
customerName: '',
phoneNumber: '',
deliveryAddress: '',
orderDetails: '',
})

const [errors, setErrors] = useState({})
const [orders, setOrders] = useState([])
const [token, setToken] = useState('')

const [loginData, setLoginData] = useState({
email: '',
password: '',
})

const [loginError, setLoginError] = useState('')
const [isLoggingIn, setIsLoggingIn] = useState(false)
const [showPassword, setShowPassword] = useState(false)
const [isCreatingOrder, setIsCreatingOrder] = useState(false)

useEffect(() => {
const savedToken = localStorage.getItem('token');


if (savedToken) {
  setToken(savedToken)
}


}, [])

useEffect(() => {
if (!token) return


const socket = io(API_URL)

socket.on('delivery:status_updated', (updatedDelivery) => {
  console.log('Status updated:', updatedDelivery)

  setOrders((currentOrders) =>
    currentOrders.map((order) =>
      order.id === updatedDelivery.id
        ? { ...order, ...updatedDelivery }
        : order
    )
  )
})

return () => {
  socket.disconnect()
}


}, [token])

const validateForm = () => {
const newErrors = {}


const namePattern =
  /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/

if (!formData.customerName.trim()) {
  newErrors.customerName = 'Customer name is required.'
} else if (!namePattern.test(formData.customerName.trim())) {
  newErrors.customerName =
    'Enter a valid name using letters and appropriate punctuation.'
}

const phone = formData.phoneNumber.replace(/\s+/g, '')
const phonePattern = /^(?:07\d{8}|\+2547\d{8})$/

if (!formData.phoneNumber.trim()) {
  newErrors.phoneNumber = 'Phone number is required.'
} else if (!phonePattern.test(phone)) {
  newErrors.phoneNumber =
    'Enter a valid Kenyan mobile number, e.g. 0712345678 or +254712345678.'
}

if (!formData.deliveryAddress.trim()) {
  newErrors.deliveryAddress = 'Delivery address is required.'
} else if (formData.deliveryAddress.trim().length < 10) {
  newErrors.deliveryAddress =
    'Please provide enough information for the rider to identify the location.'
}

if (!formData.orderDetails.trim()) {
  newErrors.orderDetails = 'Order details are required.'
} else if (formData.orderDetails.trim().length < 3) {
  newErrors.orderDetails =
    'Please describe the item or items being ordered.'
}

setErrors(newErrors)

return Object.keys(newErrors).length === 0


}

const handleChange = (event) => {
const { name, value } = event.target


const cleanedValue =
  name === 'phoneNumber'
    ? value.replace(/\s+/g, '')
    : value

setFormData({
  ...formData,
  [name]: cleanedValue,
})

if (errors[name]) {
  setErrors({
    ...errors,
    [name]: '',
  })
}


}

const handleLoginChange = (event) => {
const { name, value } = event.target


setLoginData({
  ...loginData,
  [name]: value,
})


}

const handleLogin = async (event) => {
event.preventDefault()


setLoginError('')
setIsLoggingIn(true)

try {
  const response = await fetch(
    API_URL + '/api/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: loginData.email,
        password: loginData.password,
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Login failed.')
  }

  localStorage.setItem('token', data.token)
  setToken(data.token)

  setLoginData({
    email: '',
    password: '',
  })
} catch (error) {
  setLoginError(error.message)
} finally {
  setIsLoggingIn(false)
}


}

const handleSubmit = async (event) => {
event.preventDefault()


const isValid = validateForm()

if (!isValid) {
  return
}

if (!token) {
  alert('Please log in before creating an order.')
  return
}

setIsCreatingOrder(true)

try {
  const response = await fetch(
    API_URL + '/api/orders',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        customer_name: formData.customerName,
        phone_number: formData.phoneNumber,
        delivery_address: formData.deliveryAddress,
        order_details: formData.orderDetails,
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.error || 'Failed to create order.'
    )
  }

  setOrders((currentOrders) => [
    ...currentOrders,
    data.data,
  ])

  alert('Order created successfully!')

  setFormData({
    customerName: '',
    phoneNumber: '',
    deliveryAddress: '',
    orderDetails: '',
  })

  setErrors({})
} catch (error) {
  alert(error.message)
} finally {
  setIsCreatingOrder(false)
}


}

return ( <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">


  <header className="bg-indigo-700 text-white shadow-md">
    <div className="max-w-6xl mx-auto px-6 py-5">
      <h1 className="text-2xl font-bold">
        Retailer Dashboard
      </h1>

      <p className="text-indigo-200 text-sm mt-1">
        Create and monitor customer delivery orders
      </p>
    </div>
  </header>

  <main className="max-w-6xl mx-auto px-6 py-10">
    <div className="max-w-2xl mx-auto">

      {!token ? (
        <div className="mb-8 bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">

          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
            <h2 className="text-2xl font-bold">
              Retailer Login
            </h2>

            <p className="text-indigo-100 mt-1">
              Log in to create and manage your delivery orders.
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={loginData.email}
                onChange={handleLoginChange}
                placeholder="Enter your email"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                 />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                 >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-red-600 text-sm">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition duration-200"
            >
              {isLoggingIn
                ? 'Logging in...'
                : 'Log In'}
            </button>

          </form>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">

            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
              <h2 className="text-2xl font-bold">
                Create New Order
              </h2>

              <p className="text-indigo-100 mt-1">
                Enter the customer's delivery information below.
              </p>
            </div>

            <div className="p-8">
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Customer Name
                  </label>

                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder="e.g. Jane Doe"
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                      errors.customerName
                        ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                    }`}
                  />

                  {errors.customerName && (
                    <p className="text-red-600 text-sm mt-2">
                      {errors.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="0712345678 or +254712345678"
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                      errors.phoneNumber
                        ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                    }`}
                  />

                  <p className="text-xs text-gray-500 mt-2">
                    Kenyan mobile number. Spaces are removed automatically.
                  </p>

                  {errors.phoneNumber && (
                    <p className="text-red-600 text-sm mt-2">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Delivery Address
                  </label>

                  <textarea
                    name="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={handleChange}
                    placeholder="e.g. Kilimani Nairobi House 12"
                    rows="3"
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition resize-none ${
                      errors.deliveryAddress
                        ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                    }`}
                  />

                  {errors.deliveryAddress && (
                    <p className="text-red-600 text-sm mt-2">
                      {errors.deliveryAddress}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Order Details
                  </label>

                  <textarea
                    name="orderDetails"
                    value={formData.orderDetails}
                    onChange={handleChange}
                    placeholder="e.g. 2 blue shirts, size M"
                    rows="4"
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition resize-none ${
                      errors.orderDetails
                        ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                    }`}
                  />

                  {errors.orderDetails && (
                    <p className="text-red-600 text-sm mt-2">
                      {errors.orderDetails}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isCreatingOrder}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition duration-200"
                >
                  {isCreatingOrder
                    ? 'Creating Order...'
                    : 'Create Order'}
                </button>

              </form>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">

            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
              <h2 className="text-2xl font-bold">
                Your Orders
              </h2>

              <p className="text-indigo-100 mt-1">
                Monitor your orders and delivery status.
              </p>
            </div>

            <div className="p-8">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No orders created yet.
                  </p>

                  <p className="text-sm text-gray-400 mt-1">
                    Your created orders will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">

                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-xl p-5 bg-gray-50"
                    >

                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-indigo-700">
                          {order.tracking_number || order.id}
                        </h3>

                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-semibold">
                          {order.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-700">

                        <p>
                          <strong>Customer:</strong>{' '}
                          {order.customer_name}
                        </p>

                        <p>
                          <strong>Delivery Address:</strong>{' '}
                          {order.delivery_address}
                        </p>

                        <p>
                          <strong>Order Details:</strong>{' '}
                          {order.order_details}
                        </p>

                        <p>
                          <strong>Rider:</strong>{' '}
                          {order.rider_name || 'Not assigned'}
                        </p>

                        <p className="text-gray-500">
                          <strong>Created:</strong>{' '}
                          {new Date(
                            order.created_at
                          ).toLocaleString()}
                        </p>

                      </div>
                    </div>
                  ))}

                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  </main>
</div>


)
}

export default App
