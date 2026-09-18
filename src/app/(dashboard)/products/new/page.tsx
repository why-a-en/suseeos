import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { NewProductForm } from "./new-product-form";

// Everything on one form, visible up front — no separate step to notice or
// miss (see docs/PRD.md §6.1: attaching a Modifier happens "without
// leaving the form"). Any number of Modifiers can be created right here;
// picking from an *existing* Modifier instead of creating a new one still
// happens on the product's own page after this.
export default function NewProductPage() {
  return (
    <Screen>
      <TopBar title="Add a product" backHref="/products" />
      <ScrollBody>
        <NewProductForm />
      </ScrollBody>
    </Screen>
  );
}
