import React from "react";
import { TouchableOpacity, Text, TouchableOpacityProps, ViewStyle, TextStyle } from "react-native";
import { VariantProps, cva } from "class-variance-authority";
import { cn } from "../utils";

const buttonVariants = {
  text: { defaultText: "text-lg text-white", primaryText: "text-white text-center text-lg", secondaryText: "text-green font-semibold text-lg" },
  intent: { default: "bg-red-600 text-center ", secondary: "bg-green-500", primary: ["bg-blue-500"] },
  size: { small: ["text-sm", "py-2", "px-4"], medium: ["text-base", "py-2", "px-4"], large: ["text-lg", "py-4", "px-4"] },
};
const buttonStyles = cva(["rounded-2xl align-center "], { variants: buttonVariants, compoundVariants: [{ intent: "primary", size: "small", className: "" }] });

type ButtonVariantsText = keyof (typeof buttonVariants)["text"];

export const Button = ({ children, intent, size, ...props }: TouchableOpacityProps & VariantProps<typeof buttonStyles>) => {
  const textStyles = buttonVariants["text"][`${intent}Text` as ButtonVariantsText];
  return (
    <TouchableOpacity className={cn(buttonStyles({ intent, size }))} {...props}>
      <Text className={cn(textStyles, "text-center")}>{children}</Text>
    </TouchableOpacity>
  );
};
export default Button;
