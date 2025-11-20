import React, { useState, useEffect } from "react";
import api from "../utils/api";
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
    isfeatured: false,  // FIXED
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

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleImageChange = (e) => {
    setImages([...images, ...e.target.files]);
  };

  const uploadImages = async (productId) => {
    const uploadedUrls = [];

    for (let i = 0; i < images.length; i++) {
      const fd = new FormData();
      fd.append("image", images[i]);

      try {
        const { data } = await api.post(
          `/products/${productId}/images`,
          fd,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
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

      const payload = {
        ...formData,
        price: Number(formData.price),
        countInStock: Number(formData.countInStock),
      };

      let productId = editingId;

      if (editingId) {
        await api.put(`/products/${editingId}`, payload, { headers });
      } else {
        const { data } = await api.post("/products", payload, { headers });
        productId = data._id;
      }

      if (images.length > 0) {
        const uploadedUrls = await uploadImages(productId);
        setExistingImages([...existingImages, ...uploadedUrls]);
      }

      alert("Product saved successfully!");

      // RESET EVERYTHING
      setEditingId(null);
      setFormData({
        name: "",
        brand: "",
        category: "",
        description: "",
        price: "",
        countInStock: "",
        isfeatured: false,
      });
      setImages([]);
      setExistingImages([]);

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
      isfeatured: p.isfeatured,
    });

    setExistingImages(p.images?.map((img) => img.url) || []);
    setImages([]);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await api.delete(`/products/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

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

      setExistingImages(existingImages.filter((u) => u !== url));
      alert("Image deleted.");
    } catch (error) {
      console.error(error);
      alert("Failed to delete image.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-4xl font-extrabold mb-8 text-gray-800">Admin Product Dashboard</h1>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-gradient-to-r from-gray-50 via-white to-gray-50 p-8 rounded-2xl shadow-xl mb-12"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-700">
          {editingId ? "Edit Product" : "Add New Product"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <input type="text" name="name" placeholder="Product Name" value={formData.name} onChange={handleChange} className="border px-4 py-3 rounded-xl" required />

          <input type="text" name="brand" placeholder="Brand" value={formData.brand} onChange={handleChange} className="border px-4 py-3 rounded-xl" required />

          <input type="text" name="category" placeholder="Category" value={formData.category} onChange={handleChange} className="border px-4 py-3 rounded-xl" required />

          <input type="number" name="price" placeholder="Price" value={formData.price} onChange={handleChange} className="border px-4 py-3 rounded-xl" required />

          <input type="number" name="countInStock" placeholder="Count In Stock" value={formData.countInStock} onChange={handleChange} className="border px-4 py-3 rounded-xl" required />

          <div className="flex items-center gap-3">
            <input type="checkbox" name="isfeatured" checked={formData.isfeatured} onChange={handleChange} className="w-5 h-5" />
            <label className="text-gray-700 font-medium">Featured Product</label>
          </div>

          <input type="file" multiple onChange={handleImageChange} className="border px-4 py-3 rounded-xl cursor-pointer" />
        </div>

        <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} className="border w-full mt-5 px-4 py-3 rounded-xl" />

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-5">
            {existingImages.map((url, idx) => (
              <div key={idx} className="relative group">
                <img src={url} alt="Product" className="h-28 w-28 object-cover rounded-xl shadow-md" />
                <button
                  onClick={() => handleDeleteImage(url)}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl flex items-center gap-2">
            <FaCheck /> {editingId ? "Update Product" : "Add Product"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: "",
                  brand: "",
                  category: "",
                  description: "",
                  price: "",
                  countInStock: "",
                  isfeatured: false,
                });
                setImages([]);
                setExistingImages([]);
              }}
              className="bg-gray-300 text-gray-900 px-6 py-3 rounded-xl flex items-center gap-2"
            >
              <FaTimes /> Cancel
            </button>
          )}
        </div>
      </form>

      {/* PRODUCT LIST */}
      <h2 className="text-2xl font-bold mb-6 text-gray-700">All Products</h2>

      {loading ? (
        <p>Loading...</p>
      ) : products.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p._id} className="bg-white rounded-2xl shadow-lg relative overflow-hidden">
              <img src={p.images?.[0]?.url || "https://via.placeholder.com/150"} alt={p.name} className="h-48 w-full object-cover" />

              <div className="p-4">
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <p className="text-indigo-600 font-bold">${p.price}</p>
                <p className="text-gray-500">Stock: {p.countInStock}</p>
              </div>

              {p.isfeatured && (
                <span className="absolute top-3 left-3 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                  Featured
                </span>
              )}

              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => handleEdit(p)} className="text-green-600 bg-white p-2 rounded-full shadow">
                  <FaEdit />
                </button>
                <button onClick={() => handleDelete(p._id)} className="text-red-600 bg-white p-2 rounded-full shadow">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProductPage;
