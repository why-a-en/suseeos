import { Screen } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { NewCustomerForm } from "./new-customer-form";

export default function NewCustomerPage() {
  return (
    <Screen>
      <TopBar title="New customer" backHref="/customers" />
      <NewCustomerForm />
    </Screen>
  );
}
