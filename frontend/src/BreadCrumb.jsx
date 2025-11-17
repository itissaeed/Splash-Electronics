import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";

const Breadcrumb = ({ items }) => {
  return (
    <nav className="text-gray-500 text-sm flex items-center gap-2 py-4">
      
      {/* Home Icon */}
      <Link to="/" className="text-gray-600 hover:text-indigo-500">
        <FaHome className="text-lg" />
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          
          {/* Slash */}
          <span>/</span>

          {/* Link or Active text */}
          {item.to ? (
            <Link
              to={item.to}
              className="hover:text-indigo-500 font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-black">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;
