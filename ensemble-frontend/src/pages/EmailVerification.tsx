import { useEffect, useMemo, useState } from "react";
import { applyActionCode, getAuth } from "firebase/auth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import app from "./firebase";

type VerifyState = "idle" | "loading" | "success" | "error";

const T = {
	bg: "#080a12",
	panel: "#0d0f1a",
	input: "#13151f",
	border: "#2a2d3e",
	borderFocus: "#4a6fa5",
	accent: "#4a6fa5",
	text: "#ffffff",
	muted: "#8b8ea1",
	error: "#e05252",
	success: "#52e0a0",
	fontDisplay: "'Syne', sans-serif",
	fontBody: "'DM Sans', sans-serif",
};

function getFirebaseErrorMessage(code: string) {
	switch (code) {
		case "auth/invalid-action-code":
			return "This verification link or code is invalid.";
		case "auth/expired-action-code":
			return "This verification link has expired. Please request a new one.";
		case "auth/user-disabled":
			return "This account is disabled.";
		case "auth/user-not-found":
			return "No user account was found for this verification request.";
		default:
			return "Verification failed. Please try again.";
	}
}

export default function EmailVerification() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const auth = useMemo(() => getAuth(app), []);

	const [verificationCode, setVerificationCode] = useState("");
	const [state, setState] = useState<VerifyState>("idle");
	const [message, setMessage] = useState("Paste your email verification code or open the link from your inbox.");
	const [focused, setFocused] = useState(false);

	const email = searchParams.get("email");

	const verifyCode = async (code: string) => {
		if (!code.trim()) {
			setState("error");
			setMessage("Enter your verification code first.");
			return;
		}

		setState("loading");
		setMessage("Verifying your email...");

		try {
			await applyActionCode(auth, code.trim());
			setState("success");
			setMessage("Email verified successfully. You can now sign in.");
		} catch (error: any) {
			setState("error");
			setMessage(getFirebaseErrorMessage(error?.code));
		}
	};

	useEffect(() => {
		const mode = searchParams.get("mode");
		const oobCode = searchParams.get("oobCode");

		if (mode === "verifyEmail" && oobCode) {
			setVerificationCode(oobCode);
			verifyCode(oobCode);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);

	return (
		<>
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
				*, *::before, *::after { box-sizing: border-box; }
				body { margin: 0; background: ${T.bg}; font-family: ${T.fontBody}; }
				@keyframes ens-fadeIn {
					from { opacity: 0; transform: translateY(16px); }
					to { opacity: 1; transform: translateY(0); }
				}
				@keyframes ens-spin { to { transform: rotate(360deg); } }
			`}</style>

			<main
				style={{
					minHeight: "100vh",
					display: "grid",
					placeItems: "center",
					background:
						"radial-gradient(circle at 20% 20%, rgba(74,111,165,.15), transparent 35%), radial-gradient(circle at 80% 80%, rgba(82,224,160,.08), transparent 30%), #080a12",
					padding: 20,
				}}
			>
				<section
					style={{
						width: "100%",
						maxWidth: 520,
						background: T.panel,
						border: `1px solid ${T.border}`,
						borderRadius: 16,
						padding: "28px 24px",
						animation: "ens-fadeIn .35s ease",
						boxShadow: "0 24px 80px rgba(0,0,0,.35)",
					}}
				>
					<h1
						style={{
							margin: 0,
							color: T.text,
							fontFamily: T.fontDisplay,
							fontSize: 32,
							lineHeight: 1.1,
							letterSpacing: -0.5,
						}}
					>
						Verify your email
					</h1>

					<p style={{ margin: "10px 0 0", color: T.muted, fontSize: 14, lineHeight: 1.6 }}>
						{email ? `We sent a verification link to ${email}.` : "Use the verification link from your inbox or paste the code below."}
					</p>

					<div style={{ marginTop: 18 }}>
						<label
							htmlFor="verification-code"
							style={{ display: "block", color: T.muted, fontSize: 12, marginBottom: 8 }}
						>
							Verification code
						</label>
						<input
							id="verification-code"
							type="text"
							value={verificationCode}
							onChange={(e) => setVerificationCode(e.target.value)}
							placeholder="Paste code from email link"
							onFocus={() => setFocused(true)}
							onBlur={() => setFocused(false)}
							style={{
								width: "100%",
								borderRadius: 10,
								border: `1px solid ${focused ? T.borderFocus : T.border}`,
								background: T.input,
								padding: "12px 14px",
								color: T.text,
								outline: "none",
								fontSize: 14,
							}}
						/>
					</div>

					<div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
						<button
							onClick={() => verifyCode(verificationCode)}
							disabled={state === "loading"}
							style={{
								border: "none",
								borderRadius: 24,
								background: "#fff",
								color: "#080a12",
								fontWeight: 700,
								padding: "11px 18px",
								cursor: state === "loading" ? "not-allowed" : "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: 8,
							}}
						>
							{state === "loading" ? (
								<>
									<span
										style={{
											width: 14,
											height: 14,
											border: "2px solid #080a12",
											borderTopColor: "transparent",
											borderRadius: "50%",
											display: "inline-block",
											animation: "ens-spin .7s linear infinite",
										}}
									/>
									Verifying...
								</>
							) : (
								"Verify email"
							)}
						</button>

						<button
							onClick={() => navigate("/signup")}
							style={{
								border: `1px solid ${T.border}`,
								borderRadius: 24,
								background: "transparent",
								color: T.text,
								fontWeight: 600,
								padding: "11px 18px",
								cursor: "pointer",
							}}
						>
							Back to sign up
						</button>
					</div>

					<p
						style={{
							margin: "16px 0 0",
							color:
								state === "error" ? T.error : state === "success" ? T.success : T.muted,
							fontSize: 13,
							lineHeight: 1.5,
							minHeight: 20,
						}}
					>
						{message}
					</p>

					<div style={{ marginTop: 14, fontSize: 13, color: T.muted }}>
						Already verified?{" "}
						<Link to="/login" style={{ color: T.accent, textDecoration: "none" }}>
							Continue to login
						</Link>
					</div>
				</section>
			</main>
		</>
	);
}
