import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
  arrayUnion
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDmHHr7ru3K_mTKXIjHcF81yq2PO2-IK8c",
  authDomain: "ecommerce-website-1773d.firebaseapp.com",
  projectId: "ecommerce-website-1773d",
  storageBucket: "ecommerce-website-1773d.firebasestorage.app",
  messagingSenderId: "781377848315",
  appId: "1:781377848315:web:6ea3a6312bd2220b69c15e",
  measurementId: "G-23C2QMZ091"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* Authentication helpers */
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const signUpWithEmail = async (email, password, role, name, phone, address) => {
  try {
    if (!name || name.trim() === '') {
      throw new Error('Name is required');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      name: name.trim(),
      phone: phone || "",
      address: address || "",
      role: role,
      approved: role === 'buyer' ? true : false,
      createdAt: new Date().toISOString()
    }, { merge: true });

    return userCredential;
  } catch (error) {
    throw new Error(error.message);
  }
};

/* Products helpers */
export const getProductsBySeller = async (sellerId) => {
  try {
    const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateProduct = async (productId, updates) => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, updates);
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteProduct = async (productId) => {
  try {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
  } catch (error) {
    throw new Error(error.message);
  }
};

/* Orders helpers */
export const getOrdersBySeller = async (sellerId) => {
  try {
    const q = query(collection(db, 'orders'), where('sellerIds', 'array-contains', sellerId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    throw new Error(error.message);
  }
};

export const getOrdersByBuyer = async (userId) => {
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    throw new Error(error.message);
  }
};

export const updateOrderStatus = async (orderId, newStatus, sellerId = null) => {
  const validStatuses = [
    'pending',
    'accepted',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'rejected',
    'cancelled'
  ];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of ${validStatuses.join(', ')}`);
  }

  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }
    const orderData = orderDoc.data();
    if (sellerId && !orderData.sellerIds?.includes(sellerId)) {
      throw new Error('Unauthorized: Seller not associated with this order');
    }

    const updates = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      statusHistory: arrayUnion({
        status: newStatus,
        timestamp: new Date().toISOString(),
        updatedBy: sellerId || 'system'
      })
    };
    if (sellerId) {
      updates.lastUpdatedBy = sellerId;
    }

    await updateDoc(orderRef, updates);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw new Error(error.message);
  }
};

export const getOrderTracking = async (orderId) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    if (orderDoc.exists()) {
      return { id: orderDoc.id, ...orderDoc.data() };
    }
    throw new Error('Order not found');
  } catch (error) {
    throw new Error(error.message);
  }
};

/* New: updateOrder and deleteOrder (used by Admin Orders UI) */
export const updateOrder = async (orderId, updates) => {
  try {
    if (!orderId) throw new Error('orderId is required');
    const orderRef = doc(db, 'orders', orderId);
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    await updateDoc(orderRef, payload);
    return true;
  } catch (error) {
    console.error('updateOrder error:', error);
    throw new Error(error.message);
  }
};

/**
 * deleteOrder(orderId, hardDelete = true)
 * - If hardDelete === true: remove document from Firestore.
 * - If hardDelete === false: mark order as deleted (soft delete).
 */
export const deleteOrder = async (orderId, hardDelete = true) => {
  try {
    if (!orderId) throw new Error('orderId is required');
    const orderRef = doc(db, 'orders', orderId);
    if (hardDelete) {
      await deleteDoc(orderRef);
    } else {
      await updateDoc(orderRef, { deleted: true, updatedAt: new Date().toISOString() });
    }
    return true;
  } catch (error) {
    console.error('deleteOrder error:', error);
    throw new Error(error.message);
  }
};

/* Users / Sellers helpers */
export const getSellerProfile = async (userId) => {
  try {
    if (!userId) return null;
    const q = query(collection(db, 'users'), where('uid', '==', userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error('getSellerProfile error:', error);
    throw new Error(error.message);
  }
};

export const updateSellerProfile = async (userId, updates) => {
  try {
    const q = query(collection(db, 'users'), where('uid', '==', userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userRef = doc(db, 'users', querySnapshot.docs[0].id);
      await updateDoc(userRef, updates);
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateUser = async (userId, updates) => {
  try {
    const q = query(collection(db, 'users'), where('uid', '==', userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userRef = doc(db, 'users', querySnapshot.docs[0].id);
      await updateDoc(userRef, updates);
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteUser = async (userId) => {
  try {
    const q = query(collection(db, 'users'), where('uid', '==', userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userRef = doc(db, 'users', querySnapshot.docs[0].id);
      await deleteDoc(userRef);
      console.log('User deleted:', userId);
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error(error.message);
  }
};

/* Categories */
export const getCategories = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    throw new Error(error.message);
  }
};

export const addCategory = async (categoryData) => {
  try {
    const docRef = await addDoc(collection(db, 'categories'), categoryData);
    return { id: docRef.id, ...categoryData };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateCategory = async (categoryId, updates) => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, updates);
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    const productsQuery = query(collection(db, 'products'), where('category', '==', categoryId));
    const productsSnapshot = await getDocs(productsQuery);
    if (!productsSnapshot.empty) {
      throw new Error('Cannot delete category: it is used by existing products.');
    }
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
  } catch (error) {
    throw new Error(error.message);
  }
};

/* General product listing */
export const getProducts = async (categoryId = null) => {
  try {
    let qRef = collection(db, 'products');
    if (categoryId) {
      qRef = query(collection(db, 'products'), where('category', '==', categoryId));
    }
    const querySnapshot = await getDocs(qRef);
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    throw new Error(error.message);
  }
};

export const addProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), productData);
    return { id: docRef.id, ...productData };
  } catch (error) {
    throw new Error(error.message);
  }
};

/* ---------------------------
   Image utilities (added)
   - resizeImageFile: client-side resize keeping aspect ratio, returns Blob (JPEG)
   - uploadImage: validate, resize, upload to Storage, return download URL
   --------------------------- */

/**
 * resizeImageFile(file, maxWidth, maxHeight, quality)
 * - file: File (image)
 * - maxWidth / maxHeight: limits to resize to (keeps aspect ratio)
 * - quality: 0..1 for JPEG quality
 * Returns: Promise<Blob>
 */
const resizeImageFile = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file for resizing'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate new size keeping aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const ratio = Math.min(widthRatio, heightRatio);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Canvas is empty'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * uploadImage(file, sellerId, options)
 * - file: File object from input[type="file"]
 * - sellerId: string (used in storage path)
 * - options: { maxWidth, maxHeight, quality }
 * Returns: download URL string
 */
export const uploadImage = async (file, sellerId = 'unknown', options = {}) => {
  try {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      throw new Error('Invalid image file');
    }

    const maxWidth = options.maxWidth || 1200;
    const maxHeight = options.maxHeight || 1200;
    const quality = typeof options.quality === 'number' ? options.quality : 0.8;

    // Resize image client-side
    const resizedBlob = await resizeImageFile(file, maxWidth, maxHeight, quality);

    // Build safe filename
    const timestamp = Date.now();
    const safeName = (file.name || 'image').replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
    const filename = `${timestamp}_${safeName}.jpg`;
    const path = `products/${sellerId}/${filename}`;

    const ref = storageRef(storage, path);
    // Upload resized blob with correct contentType
    await uploadBytes(ref, resizedBlob, { contentType: 'image/jpeg' });

    // Get public download URL
    const url = await getDownloadURL(ref);
    return url;
  } catch (err) {
    console.error('uploadImage error:', err);
    throw err;
  }
};

/* Orders / Wishlist / Addresses / Profile / Misc */
export const addOrder = async (userId, items, total, customerEmail, shippingInfo, payment) => {
  try {
    const sellerIds = [...new Set((items || []).map(item => item.sellerId).filter(Boolean))];
    const orderData = {
      userId,
      items,
      total,
      customerEmail,
      sellerIds,
      shippingInfo: shippingInfo || null,
      payment: payment || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date().toISOString(),
          updatedBy: 'system'
        }
      ]
    };
    const docRef = await addDoc(collection(db, 'orders'), orderData);
    return { id: docRef.id, ...orderData };
  } catch (error) {
    throw new Error(error.message);
  }
};

/* getOrders: supports optional sellerId. If sellerId omitted, returns all orders. */
export const getOrders = async (sellerId = null) => {
  try {
    if (sellerId) {
      const q = query(collection(db, 'orders'), where('sellerIds', 'array-contains', sellerId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

export const addToWishlist = async (userId, productId) => {
  try {
    const wishlistRef = collection(db, 'wishlists');
    const q = query(wishlistRef, where('userId', '==', userId), where('productId', '==', productId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      await addDoc(wishlistRef, { userId, productId, addedAt: new Date().toISOString() });
    }
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const removeFromWishlist = async (userId, productId) => {
  try {
    const q = query(collection(db, 'wishlists'), where('userId', '==', userId), where('productId', '==', productId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const wishlistDoc = querySnapshot.docs[0];
      await deleteDoc(doc(db, 'wishlists', wishlistDoc.id));
    }
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getWishlist = async (userId) => {
  try {
    const q = query(collection(db, 'wishlists'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const wishlistItems = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const productIds = wishlistItems.map(item => item.productId);
    if (productIds.length === 0) return [];
    // Firestore 'in' operator supports up to 10 items; handle defensively
    const chunk = productIds.slice(0, 10);
    const productsQuery = query(collection(db, 'products'), where('__name__', 'in', chunk));
    const productsSnapshot = await getDocs(productsQuery);
    return productsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const q = query(collection(db, 'users'), where('uid', '==', userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userRef = doc(db, 'users', querySnapshot.docs[0].id);
      await updateDoc(userRef, updates);
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

export const addAddress = async (userId, address) => {
  try {
    const docRef = await addDoc(collection(db, 'addresses'), { userId, ...address });
    return { id: docRef.id, ...address };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getAddresses = async (userId) => {
  try {
    const q = query(collection(db, 'addresses'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteAddress = async (addressId) => {
  try {
    const addressRef = doc(db, 'addresses', addressId);
    await deleteDoc(addressRef);
  } catch (error) {
    throw new Error(error.message);
  }
};

export const changeUserPassword = async (user, newPassword) => {
  try {
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};