import { Profile, supabase } from "@/libs/supabaseclient";
import Link from "next/link";
import { useRouter } from "next/router";

interface NavbarProps {
  profile?: Profile | null;
}

export default function Navbar({ profile }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link
            href={
              profile
                ? profile.role === "admin"
                  ? "/admin/dashboard"
                  : "/dashboard"
                : "/"
            }
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 bg-orange-500 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">JC</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              JanConnect
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {profile ? (
              <>
                <span className="text-xs text-gray-500 hidden sm:block">
                  {profile.email}{" "}
                  {profile.role === "admin" && (
                    <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs ml-1">
                      Admin
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/admin/login"
                  className="text-sm text-white bg-gray-800 hover:bg-gray-900 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Admin
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
