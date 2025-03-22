import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSetAtom } from "jotai";
import { deleteNoteAtom, selectedNoteIndexAtom } from "@/store";

interface SwipeableRefType {
  close: () => void;
  openLeft: () => void;
  openRight: () => void;
  reset: () => void;
}

type ItemProps = {
  id: string;
  title: string;
  lastEditTime: number;
  onPress?: () => void;
  index: number;
};

const NotesListItem = ({
  id,
  title,
  lastEditTime,
  onPress,
  index,
}: ItemProps) => {
  const formattedDate = new Date(lastEditTime).toLocaleString();
  const swipeableRef = useRef<SwipeableRefType>(null);
  const deleteNote = useSetAtom(deleteNoteAtom);
  const setSelectedIndex = useSetAtom(selectedNoteIndexAtom);

  const handleDelete = (noteId: string) => {
    // First select this note (so it can be deleted)
    setSelectedIndex(index);
    // Then delete it
    deleteNote(noteId);
    // Close the swipeable
    if (swipeableRef.current !== null) {
      swipeableRef.current?.close();
    }
  };

  const renderRightActions = (
    prog: SharedValue<number>,
    drag: SharedValue<number>
  ) => {
    const buttonAnimation = useAnimatedStyle(() => {
      const dragValue = drag.value;
      const width = Math.min(100, Math.max(20, Math.abs(dragValue)));

      return {
        width: width,
        opacity: Math.min(1, prog.value * 5),
      };
    });

    const textAnimation = useAnimatedStyle(() => {
      // Don't calculate width twice, access drag.value only once
      const dragValue = drag.value;
      const width = Math.min(100, Math.max(20, Math.abs(dragValue)));

      return {
        opacity: width < 60 ? 0 : 1,
      };
    });

    return (
      <View style={styles.rightActionContainer}>
        <Reanimated.View
          style={[styles.deleteButtonContainer, buttonAnimation]}
        >
          <RectButton
            style={styles.deleteButton}
            onPress={() => handleDelete(id)}
          >
            <Reanimated.Text style={[styles.deleteText, textAnimation]}>
              Delete
            </Reanimated.Text>
          </RectButton>
        </Reanimated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={1} // Decrease from 2 to make it less resistant
      rightThreshold={40}
      overshootRight={false} // Prevent overshooting which can slow down return
      leftThreshold={10} // Makes it snap back more quickly when swiping back
    >
      <Pressable onPress={onPress}>
        <View style={styles.item}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.lastEditTime}>{formattedDate}</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  item: {
    backgroundColor: "white",
    padding: 20,
    gap: 6,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontSize: 20,
  },
  lastEditTime: {
    fontSize: 12,
    color: "#888",
  },
  rightActionContainer: {
    width: 100,
    marginLeft: 0,
    marginRight: 16,
    marginVertical: 8,
    alignItems: "flex-end", // Keep right-aligned
    justifyContent: "center",
  },
  deleteButtonContainer: {
    // This will be animated
    height: "100%",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: "100%", // Fill the animated container
    height: "100%",
    borderRadius: 10,
  },
  deleteText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default NotesListItem;
