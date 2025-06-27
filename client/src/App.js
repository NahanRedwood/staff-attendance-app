    import React, { useState, useEffect, useRef } from 'react';
    import { initializeApp } from 'firebase/app';
    import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
    import { getFirestore, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

    // --- Login Component ---
    const Login = ({ onSignIn, errorMessage, isLoading }) => {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter">
                <style>
                    {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    .font-inter {
                        font-family: 'Inter', sans-serif;
                    }
                    .animate-fade-in {
                        animation: fadeIn 0.3s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    `}
                </style>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-indigo-200 text-center max-w-sm w-full animate-fade-in">
                    <h2 className="text-3xl font-bold text-indigo-700 mb-6">Welcome!</h2>
                    <p className="text-gray-600 mb-8">Sign in to manage your staff time and attendance.</p>
                    <button
                        onClick={onSignIn}
                        className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg text-lg font-semibold hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Signing In...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path d="M12.24 10.27c-.07-.4-.11-.82-.11-1.27 0-3.23 2.58-5.85 5.78-5.85 3.12 0 5.37 2.45 5.37 5.78 0 3.14-2.15 5.51-5.32 5.51-.83 0-1.63-.13-2.37-.37l-1.92 1.92c-.88.48-1.78.8-2.68.96-.9.16-1.76.24-2.61.24-4.52 0-8.21-3.69-8.21-8.21 0-4.52 3.69-8.21 8.21-8.21 2.37 0 4.38 1.05 5.84 2.58l3.19-3.19c-2.03-1.91-4.73-3.08-7.58-3.08-6.63 0-12 5.37-12 12s5.37 12 12 12c4.86 0 8.9-2.88 10.95-7h-4.48c-.61 2.1-2.58 3.63-4.87 3.63-2.92 0-5.26-2.34-5.26-5.26z"/>
                                </svg>
                                <span>Sign in with Google</span>
                            </>
                        )}
                    </button>
                    {errorMessage && (
                        <p className="text-red-600 mt-4 text-sm">{errorMessage}</p>
                    )}
                </div>
            </div>
        );
    };

    // Main App component
    const App = () => {
        // Firebase related states
        const [db, setDb] = useState(null);
        const [auth, setAuth] = useState(null);
        const [userId, setUserId] = useState(null);
        const [currentUser, setCurrentUser] = useState(null); // Stores the Firebase user object
        const [isAuthReady, setIsAuthReady] = useState(false); // To ensure Firestore operations wait for auth
        const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Tracks initial authentication loading

        // Application states
        const [employees, setEmployees] = useState([]);
        const [loading, setLoading] = useState(false);
        const [message, setMessage] = useState('');
        const [messageType, setMessageType] = useState(''); // 'success' or 'error'

        // Form states for onboarding
        const [onboardName, setOnboardName] = useState('');
        const [onboardId, setOnboardId] = useState('');
        const [onboardStartDate, setOnboardStartDate] = useState('');
        const [onboardDepartment, setOnboardDepartment] = useState('');
        const [onboardLocation, setOnboardLocation] = useState('Office');

        // Form states for offboarding
        const [offboardName, setOffboardName] = useState('');
        const [offboardLastDate, setOffboardLastDate] = useState('');

        // Modal states for confirmation/alerts
        const [showModal, setShowModal] = useState(false);
        const [modalContent, setModalContent] = useState('');
        const modalActionRef = useRef(null); // Ref to store the action function for the modal

        // Initialize Firebase and handle authentication
        useEffect(() => {
            // Your web app's Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyBuylwt4gxhYyxh8mStRubpONDZrGWMr9U",
                authDomain: "project-sara-a1cbe.firebaseapp.com",
                projectId: "project-sara-a1cbe",
                storageBucket: "project-sara-a1cbe.firebasestorage.app",
                messagingSenderId: "761278563316",
                appId: "1:761278563316:web:451b721cf3483f8656efa1",
                measurementId: "G-K510FDEMDX"
            };

            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // This listener ensures we react to auth state changes, including successful Google sign-in
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    // If a user is logged in (Google, anonymous, etc.)
                    setCurrentUser(user);
                    setUserId(user.uid);
                } else {
                    // If no user is logged in, attempt anonymous sign-in as a fallback
                    try {
                        await signInAnonymously(firebaseAuth);
                        // The onAuthStateChanged will be triggered again with the anonymous user
                    } catch (error) {
                        console.error("Error with initial anonymous auth fallback:", error);
                        setMessage("Authentication failed. Please try signing in manually.");
                        setMessageType('error');
                    }
                }
                setIsAuthReady(true); // Mark auth system as ready after initial check/attempt
                setIsLoadingAuth(false); // Finished initial auth loading
            });

            return () => unsubscribe(); // Cleanup auth listener
        }, []); // Runs only once on component mount

        // Handle Google Sign-in
        const handleGoogleSignIn = async () => {
            setLoading(true);
            setMessage('');
            setMessageType('');
            if (!auth) {
                showMessageBox("Authentication service not available.", 'error');
                setLoading(false);
                return;
            }
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
                // onAuthStateChanged listener will handle setting currentUser and userId
                showMessageBox("Successfully signed in with Google!", 'success');
            } catch (error) {
                console.error("Error during Google sign-in:", error);
                let errorMessage = "Failed to sign in with Google. Please try again.";
                if (error.code === 'auth/popup-closed-by-user') {
                    errorMessage = "Sign-in cancelled by user.";
                } else if (error.code === 'auth/cancelled-popup-request') {
                    errorMessage = "Another sign-in attempt is in progress or was cancelled too quickly.";
                } else if (error.code === 'auth/auth-domain-config-error') {
                         errorMessage = "Authentication domain not configured correctly. Check Firebase console.";
                } else if (error.code === 'auth/operation-not-allowed') {
                    errorMessage = "Google sign-in is not enabled in Firebase Authentication settings.";
                }
                showMessageBox(errorMessage, 'error');
            } finally {
                setLoading(false);
            }
        };

        // Handle Sign Out
        const handleSignOut = async () => {
            setLoading(true);
            try {
                await signOut(auth);
                showMessageBox("Successfully signed out.", 'success');
                // currentUser will become null, triggering login page display
            } catch (error) {
                console.error("Error signing out:", error);
                showMessageBox(`Failed to sign out: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };


        // Fetch employees when Firebase is ready and userId is available
        useEffect(() => {
            if (!db || !userId || !isAuthReady) return; // Wait for Firebase and auth to be ready

            // Adjusted collection path
            const employeesCollectionRef = collection(db, `users/${userId}/employees`);

            // Set up real-time listener for employees
            const unsubscribe = onSnapshot(employeesCollectionRef, (snapshot) => {
                const employeesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setEmployees(employeesData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching employees:", error);
                setMessage("Failed to load employee data.");
                setMessageType('error');
                setLoading(false);
            });

            // Cleanup listener on component unmount or when dependencies change
            return () => unsubscribe();
        }, [db, userId, isAuthReady]); // Re-run if db, userId, or isAuthReady changes

        // Helper to show message box
        const showMessageBox = (content, type, action = null) => {
            setModalContent(content);
            setMessageType(type); // Set type for styling (e.g., success, error, info)
            modalActionRef.current = action; // Store action for confirmation
            setShowModal(true);
        };

        // Helper to hide message box
        const hideMessageBox = () => {
            setShowModal(false);
            setModalContent('');
            modalActionRef.current = null;
            setMessage(''); // Clear main message as well
            setMessageType('');
        };

        // Function to handle modal confirm action
        const handleModalConfirm = () => {
            if (modalActionRef.current) {
                modalActionRef.current();
            }
            hideMessageBox();
        };

        // Onboarding an employee
        const handleOnboard = async (e) => {
            e.preventDefault();
            setLoading(true);
            setMessage('');
            setMessageType('');

            if (!db || !userId) {
                showMessageBox("Application not ready. Please wait.", 'error');
                setLoading(false);
                return;
            }

            if (!onboardName || !onboardId || !onboardStartDate || !onboardDepartment || !onboardLocation) {
                showMessageBox("Please fill in all onboarding fields.", 'error');
                setLoading(false);
                return;
            }

            const startDateObj = new Date(onboardStartDate);
            if (isNaN(startDateObj)) {
                showMessageBox("Invalid start date. Please use YYYY-MM-DD format.", 'error');
                setLoading(false);
                return;
            }

            // Check if employee ID already exists
            const employeeQuery = query(collection(db, `users/${userId}/employees`), where("id", "==", onboardId));
            const existingEmployees = await getDocs(employeeQuery);

            if (!existingEmployees.empty) {
                showMessageBox(`Employee with ID "${onboardId}" already exists.`, 'error');
                setLoading(false);
                return;
            }

            try {
                // Adjusted collection paths
                const employeesCollectionRef = collection(db, `users/${userId}/employees`);
                const dailyEntriesCollectionRef = collection(db, `users/${userId}/daily_entries`);
                let batch = writeBatch(db);
                let batchCount = 0;

                // Add employee to employees collection
                const employeeDocRef = doc(employeesCollectionRef);
                batch.set(employeeDocRef, {
                    employeeFirebaseId: employeeDocRef.id,
                    name: onboardName,
                    id: onboardId,
                    startDate: onboardStartDate,
                    department: onboardDepartment,
                    location: onboardLocation,
                    status: 'Active',
                    createdAt: new Date().toISOString()
                });
                batchCount++;

                // Generate daily entries
                let currentDate = new Date(startDateObj);
                const endYear = new Date().getFullYear() + 2;
                const endDate = new Date(endYear, 11, 31);

                let entryCount = 0;
                while (currentDate <= endDate) {
                    const dateString = currentDate.toISOString().split('T')[0];
                    const entryDocRef = doc(dailyEntriesCollectionRef);
                    batch.set(entryDocRef, {
                        employeeId: onboardId,
                        employeeName: onboardName,
                        date: dateString,
                        department: onboardDepartment,
                        location: onboardLocation,
                        status: 'Scheduled',
                        workHours: null,
                        overtimeHours: null,
                        createdAt: new Date().toISOString(),
                        entryFirebaseId: entryDocRef.id
                    });

                    entryCount++;
                    batchCount++;
                    currentDate.setDate(currentDate.getDate() + 1);

                    if (batchCount >= 490) {
                        await batch.commit();
                        batch = writeBatch(db);
                        batchCount = 0;
                    }
                }

                if (batchCount > 0) {
                    await batch.commit();
                }

                showMessageBox(`Employee ${onboardName} (${onboardId}) onboarded successfully with ${entryCount} entries!`, 'success');

                setOnboardName('');
                setOnboardId('');
                setOnboardStartDate('');
                setOnboardDepartment('');
                setOnboardLocation('Office');

            } catch (error) {
                console.error("Error onboarding employee:", error);
                showMessageBox(`Failed to onboard employee: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };

        // Offboarding an employee
        const handleOffboard = async (e) => {
            e.preventDefault();
            setLoading(true);
            setMessage('');
            setMessageType('');

            if (!db || !userId) {
                showMessageBox("Application not ready. Please wait.", 'error');
                setLoading(false);
                return;
            }

            if (!offboardName || !offboardLastDate) {
                showMessageBox("Please fill in all offboarding fields.", 'error');
                setLoading(false);
                return;
            }

            const lastDateObj = new Date(offboardLastDate);
            if (isNaN(lastDateObj)) {
                showMessageBox("Invalid last working date. Please use YYYY-MM-DD format.", 'error');
                setLoading(false);
                return;
            }

            // Find the employee by name
            const employeeQuery = query(collection(db, `users/${userId}/employees`), where("name", "==", offboardName));
            const employeeSnapshot = await getDocs(employeeQuery);

            if (employeeSnapshot.empty) {
                showMessageBox(`Employee "${offboardName}" not found.`, 'error');
                setLoading(false);
                return;
            }

            const employeeData = employeeSnapshot.docs[0].data();
            const employeeDocId = employeeSnapshot.docs[0].id;
            const targetEmployeeId = employeeData.id;

            // Confirmation before deletion
            showMessageBox(
                `Are you sure you want to offboard ${offboardName}? All entries from ${offboardLastDate} onwards will be deleted.`,
                'info',
                async () => {
                    setLoading(true);
                    try {
                        const dailyEntriesCollectionRef = collection(db, `users/${userId}/daily_entries`);
                        const entriesToDeleteQuery = query(
                            dailyEntriesCollectionRef,
                            where("employeeId", "==", targetEmployeeId),
                            where("date", ">=", offboardLastDate)
                        );

                        const entriesSnapshot = await getDocs(entriesToDeleteQuery);
                        const deleteBatch = writeBatch(db);
                        let deletedCount = 0;

                        entriesSnapshot.docs.forEach(doc => {
                            deleteBatch.delete(doc.ref);
                            deletedCount++;
                        });

                        // Update employee status to 'Inactive'
                        const employeeRef = doc(db, `users/${userId}/employees`, employeeDocId);
                        deleteBatch.update(employeeRef, { status: 'Inactive', offboardDate: offboardLastDate });

                        await deleteBatch.commit();

                        showMessageBox(`Employee ${offboardName} offboarded successfully. ${deletedCount} entries removed.`, 'success');
                        setOffboardName('');
                        setOffboardLastDate('');
                    } catch (error) {
                        console.error("Error offboarding employee:", error);
                        showMessageBox(`Failed to offboard employee: ${error.message}`, 'error');
                    } finally {
                        setLoading(false);
                    }
                }
            );
        };

        // Component for the message box
        const MessageBox = ({ content, type, onConfirm, onCancel }) => {
            let bgColor, textColor, borderColor;
            switch (type) {
                case 'success':
                    bgColor = 'bg-green-100';
                    textColor = 'text-green-800';
                    borderColor = 'border-green-400';
                    break;
                case 'error':
                    bgColor = 'bg-red-100';
                    textColor = 'text-red-800';
                    borderColor = 'border-red-400';
                    break;
                case 'info':
                    bgColor = 'bg-blue-100';
                    textColor = 'text-blue-800';
                    borderColor = 'border-blue-400';
                    break;
                default:
                    bgColor = 'bg-gray-100';
                    textColor = 'text-gray-800';
                    borderColor = 'border-gray-400';
            }

            const isConfirmation = typeof onConfirm === 'function';

            return (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className={`relative ${bgColor} border ${borderColor} rounded-lg shadow-xl p-6 max-w-sm w-full animate-fade-in`}>
                        <p className={`text-lg font-semibold ${textColor} mb-4`}>{content}</p>
                        <div className="flex justify-end space-x-3">
                            {isConfirmation && (
                                <button
                                    onClick={onCancel}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={isConfirmation ? onConfirm : onCancel} // If it's not a confirmation, 'Cancel' button acts as 'OK'
                                className={`px-4 py-2 rounded-lg transition-all duration-200
                                    ${isConfirmation ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-500 text-white hover:bg-blue-600'}
                                `}
                            >
                                {isConfirmation ? 'Confirm' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

        // Show login page if not authenticated, otherwise show the main app
        if (!isAuthReady || isLoadingAuth) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter">
                    <div className="text-xl font-semibold text-indigo-700">
                        <svg className="animate-spin h-8 w-8 mr-3 text-indigo-500 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading authentication...
                    </div>
                </div>
            );
        }

        if (!currentUser) {
            return <Login onSignIn={handleGoogleSignIn} errorMessage={message} isLoading={loading} />;
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800 p-4 font-inter">
                <style>
                    {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    .font-inter {
                        font-family: 'Inter', sans-serif;
                    }
                    .animate-fade-in {
                        animation: fadeIn 0.3s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    `}
                </style>
                <header className="mb-8 text-center relative">
                    <h1 className="text-4xl font-bold text-indigo-700 mb-2">Staff Time & Attendance Manager</h1>
                    <p className="text-lg text-gray-600">Onboard and Offboard Employees with Ease</p>
                    {currentUser && (
                        <div className="flex items-center justify-center md:absolute md:top-0 md:right-0 mt-4 md:mt-0 md:mr-4">
                            <span className="text-sm text-gray-600 mr-2">
                                Logged in as <span className="font-semibold">{currentUser.displayName || currentUser.email || 'Guest'}</span>
                            </span>
                            <button
                                onClick={handleSignOut}
                                className="bg-red-500 text-white py-1 px-3 rounded-lg text-sm hover:bg-red-600 transition-all duration-200 shadow-md"
                                disabled={loading}
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                    {userId && (
                        <p className="text-sm text-gray-500 mt-2">
                            Your user ID: <span className="font-semibold break-all">{userId}</span>
                        </p>
                    )}
                </header>

                {/* Global Message Display */}
                {message && !showModal && (
                    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${messageType === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-fade-in`}>
                        {message}
                    </div>
                )}

                {showModal && (
                    <MessageBox
                        content={modalContent}
                        type={messageType}
                        onConfirm={handleModalConfirm}
                        onCancel={hideMessageBox}
                    />
                )}

                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* Onboarding Section */}
                    <section className="bg-white p-6 rounded-xl shadow-lg border border-indigo-200">
                        <h2 className="text-2xl font-semibold text-indigo-600 mb-5 pb-3 border-b border-indigo-100">Onboard New Employee</h2>
                        <form onSubmit={handleOnboard} className="space-y-4">
                            <div>
                                <label htmlFor="onboardName" className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                                <input
                                    type="text"
                                    id="onboardName"
                                    value={onboardName}
                                    onChange={(e) => setOnboardName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                    placeholder="e.g., Jane Doe"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="onboardId" className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                                <input
                                    type="text"
                                    id="onboardId"
                                    value={onboardId}
                                    onChange={(e) => setOnboardId(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                    placeholder="e.g., EMP001"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="onboardStartDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    id="onboardStartDate"
                                    value={onboardStartDate}
                                    onChange={(e) => setOnboardStartDate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="onboardDepartment" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    id="onboardDepartment"
                                    value={onboardDepartment}
                                    onChange={(e) => setOnboardDepartment(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                    placeholder="e.g., Sales"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="onboardLocation" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <select
                                    id="onboardLocation"
                                    value={onboardLocation}
                                    onChange={(e) => setOnboardLocation(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                    required
                                >
                                    <option value="Office">Office</option>
                                    <option value="Field">Field</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? 'Onboarding...' : 'Onboard Employee'}
                            </button>
                        </form>
                    </section>

                    {/* Offboarding Section */}
                    <section className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                        <h2 className="text-2xl font-semibold text-red-600 mb-5 pb-3 border-b border-red-100">Offboard Employee</h2>
                        <form onSubmit={handleOffboard} className="space-y-4">
                            <div>
                                <label htmlFor="offboardName" className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                                <input
                                    type="text"
                                    id="offboardName"
                                    value={offboardName}
                                    onChange={(e) => setOffboardName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                    placeholder="e.g., Jane Doe"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="offboardLastDate" className="block text-sm font-medium text-gray-700 mb-1">Last Working Date</label>
                                <input
                                    type="date"
                                    id="offboardLastDate"
                                    value={offboardLastDate}
                                    onChange={(e) => setOffboardLastDate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? 'Offboarding...' : 'Offboard Employee'}
                            </button>
                        </form>
                    </section>
                </div>

                {/* Employee List Section */}
                <section className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-5 pb-3 border-b border-gray-100">Active Employees</h2>
                    {loading && employees.length === 0 ? (
                        <div className="text-center text-gray-500">Loading employees...</div>
                    ) : employees.filter(emp => emp.status === 'Active').length === 0 ? (
                        <div className="text-center text-gray-500 p-4">No active employees found. Onboard new employees to see them here!</div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {employees.filter(emp => emp.status === 'Active').map((emp) => (
                                        <tr key={emp.employeeFirebaseId}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.department}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.location}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.startDate}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        );
    };

    export default App;
    