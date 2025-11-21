import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Breadcrumb from "../BreadCrumb";

const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialCategory = searchParams.get("category") || "All";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get("/products");
        const productsArray = Array.isArray(data.products) ? data.products : [];
        setProducts(productsArray);
        setFilteredProducts(productsArray);

        // Extract categories dynamically
        const uniqueCategories = ["All", ...new Set(productsArray.map((p) => p.category))];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Filter products whenever selectedCategory or searchTerm changes
  useEffect(() => {
    let filtered = products;
    if (selectedCategory !== "All") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, products]);

  // Update URL whenever selectedCategory changes
  useEffect(() => {
    if (selectedCategory === "All") {
      navigate("/products");
    } else {
      navigate(`/products?category=${encodeURIComponent(selectedCategory)}`);
    }
  }, [selectedCategory, navigate]);

  // Pagination logic
  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Dark header bar */}
      <header className="bg-gray-900 text-white py-6 shadow-lg mb-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>

          {/* Search input */}
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="hidden sm:block px-4 py-2 rounded-full w-64 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6">
        <Breadcrumb
          items={[
            { to: "/", label: "Home" },
            selectedCategory !== "All"
              ? { label: selectedCategory }
              : { label: "Products" },
          ]}
        />
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-3 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full font-medium transition ${
              selectedCategory === cat
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-indigo-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-6">
        {loading ? (
          <p className="text-gray-700">Loading products...</p>
        ) : currentProducts.length === 0 ? (
          <p className="text-gray-700">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {currentProducts.map((p) => (
              <Link
                key={p._id}
                to={`/product/${p._id}`}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition p-4 flex flex-col items-center"
              >
                <img
                  src={p.images[0]?.url || "https://via.placeholder.com/150"}
                  alt={p.name}
                  className="h-48 w-full object-contain rounded mb-4"
                />
                <h3 className="font-semibold text-lg text-gray-900 mb-2 text-center">{p.name}</h3>
                <p className="text-indigo-600 font-bold text-lg">${p.price}</p>
                <p className="text-gray-500 mt-1 text-sm">{p.category}</p>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-10 space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-2 rounded ${
                  currentPage === i + 1
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductListPage;
