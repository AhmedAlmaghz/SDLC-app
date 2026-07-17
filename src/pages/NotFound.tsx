import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="font-mono text-6xl font-bold text-primary/40">404</p>
      <h1 className="mt-4 text-xl font-bold">الصفحة غير موجودة</h1>
      <Link to="/" className="mt-6">
        <Button variant="outline">العودة للرئيسية</Button>
      </Link>
    </div>
  );
}
