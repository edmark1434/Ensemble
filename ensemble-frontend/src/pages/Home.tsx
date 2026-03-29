import api from "../lib/axios";
import {  useEffect, useState } from "react";

interface User {
    user_id: string;
    account_id: string;
    first_name: string;
    last_name: string;
    email_address: string;
    password_hash: string;
    last_seen_at: string;
    firebase_user_uuid: string;
}
const Home = () =>{
    const [users, setUsers] = useState<User[]>([]);
    useEffect(() => {
        const getAllUsers = async () => {
            try {
                const response = await api.get('/api/users');
                setUsers(response.data);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
        getAllUsers();
    }, []);

    return (
        <div>
            <h1>Welcome to Ensemble!</h1>
            <p>This is the home page of the Ensemble application.</p>
            {users && (
                <div>
                    <h2>All Users</h2>
                    <ul>
                        {users.map((user) => (
                            <li key={user.user_id}>
                                {user.first_name} {user.last_name} ({user.email_address})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
export default Home;