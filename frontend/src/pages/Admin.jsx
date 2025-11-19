import React, { useState, useEffect } from "react";
import api from "../utils/api"; // axios instance
import { FaTrash, FaEdit, FaCheck, FaTimes } from "react-icons/fa";

const AdminProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    description: "",
    price: "",
    countInStock: "",
    isFeatured: false,
  });
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/products/admin", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setProducts(data.products || []);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleImageChange = (e) => setImages([...images, ...e.target.files]);

  const uploadImages = async (productId) => {
    const uploadedUrls = [];
    for (let i = 0; i < images.length; i++) {
      const fd = new FormData();
      fd.append("image", images[i]);
      try {
        const { data } = await api.post(`/products/${productId}/images`, fd, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "multipart/form-data" },
        });
        uploadedUrls.push(data.image);
      } catch (error) {
        console.error("Image upload failed:", error);
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      let productId = editingId;

      if (editingId) {
        await api.put(`/products/${editingId}`, formData, { headers });
      } else {
        const { data } = await api.post("/products", formData, { headers });
        productId = data._id;
      }

      if (images.length > 0) {
        const uploadedUrls = await uploadImages(productId);
        setExistingImages([...existingImages, ...uploadedUrls]);
      }

      alert("Product saved successfully!");
      setEditingId(null);
      setFormData({ name: "", brand: "", category: "", description: "", price: "", countInStock: "", isFeatured: false });
      setImages([]);
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Failed to save product.");
    }
  };

  const handleEdit = (p) => {
    setEditingId(p._id);
    setFormData({
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      price: p.price,
      countInStock: p.countInStock,
      isFeatured: p.isFeatured,
    });
    setExistingImages(p.images.map(img => img.url));
    setImages([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.delete(`/products/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      alert("Product deleted successfully!");
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Failed to delete product.");
    }
  };

  const handleDeleteImage = async (url) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      const publicId = url.split("/").pop().split(".")[0];
      await api.delete(`/products/${editingId}/images`, {
        data: { public_id: publicId },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setExistingImages(existingImages.filter(u => u !== url));
      alert("Image deleted.");
    } catch (error) {
      console.error(error);
      alert("Failed to delete image.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-4xl font-extrabold mb-8 text-gray-800">Admin Product Dashboard</h1>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} className="bg-gradient-to-r from-gray-50 via-white to-gray-50 p-8 rounded-2xl shadow-xl mb-12 transition-transform transform hover:scale-[1.01]">
        <h2 className="text-2xl font-bold mb-6 text-gray-700">{editingId ? "Edit Product" : "Add New Product"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <input type="text" name="name" placeholder="Product Name" value={formData.name} onChange={handleChange} className="border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" required />
          <input type="text" name="brand" placeholder="Brand" value={formData.brand} onChange={handleChange} className="border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" required />
          <input type="text" name="category" placeholder="Category" value={formData.category} onChange={handleChange} className="border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" required />
          <input type="number" name="price" placeholder="Price" value={formData.price} onChange={handleChange} className="border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" required />
          <input type="number" name="countInStock" placeholder="Count In Stock" value={formData.countInStock} onChange={handleChange} className="border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" required />
          <div className="flex items-center gap-3">
            <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} className="w-5 h-5 accent-indigo-600" />
            <label className="text-gray-700 font-medium">Featured Product</label>
          </div>
          <input type="file" multiple onChange={handleImageChange} className="border border-gray-300 px-4 py-3 rounded-xl cursor-pointer hover:border-indigo-500 transition" />
        </div>
        <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} className="border border-gray-300 w-full mt-5 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" required />

        {existingImages.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-5">
            {existingImages.map((url, idx) => (
              <div key={idx} className="relative group">
                <img src={url} alt={`Product ${idx}`} className="h-28 w-28 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform" />
                <button type="button" onClick={() => handleDeleteImage(url)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700">
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 flex items-center gap-2 transition-transform hover:scale-105">
            <FaCheck /> {editingId ? "Update Product" : "Add Product"}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ name: "", brand: "", category: "", description: "", price: "", countInStock: "", isFeatured: false }); setImages([]); setExistingImages([]); }} className="bg-gray-300 text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-400 flex items-center gap-2 transition-transform hover:scale-105">
              <FaTimes /> Cancel
            </button>
          )}
        </div>
      </form>

      {/* Product List */}
      <h2 className="text-2xl font-bold mb-6 text-gray-700">All Products</h2>
      {loading ? <p className="text-gray-500">Loading products...</p> : products.length === 0 ? <p className="text-gray-500">No products yet.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(p => (
            <div key={p._id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-transform hover:scale-[1.02] relative overflow-hidden">
              <img src={p.images[0]?.url || "https://via.placeholder.com/150"} alt={p.name} className="h-48 w-full object-cover rounded-t-2xl" />
              <div className="p-4">
                <h3 className="font-semibold text-lg text-gray-800">{p.name}</h3>
                <p className="text-indigo-600 font-bold mt-1">${p.price}</p>
                <p className="text-gray-500 text-sm mt-1">Stock: {p.countInStock}</p>
              </div>
              {p.isFeatured && <span className="absolute top-3 left-3 text-xs font-semibold text-white bg-indigo-600 px-2 py-1 rounded-full">Featured</span>}
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(p)} className="text-green-600 hover:text-green-800 bg-white p-2 rounded-full shadow hover:shadow-md transition"><FaEdit /></button>
                <button onClick={() => handleDelete(p._id)} className="text-red-600 hover:text-red-800 bg-white p-2 rounded-full shadow hover:shadow-md transition"><FaTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProductPage;
