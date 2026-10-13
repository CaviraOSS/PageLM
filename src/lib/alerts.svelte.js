class AlertStore {
    items = $state([]);

    send(text, duration = 3000) {
        const id = crypto.randomUUID();
        this.items.push({ id, text });

        setTimeout(() => {
            this.remove(id);
        }, duration);
    }

    remove(id) {
        this.items = this.items.filter((item) => item.id !== id);
    }
}

export const alertStore = new AlertStore();
export const showAlert = (text, duration) => alertStore.send(text, duration);