async function deleteById(storeName, id) {
    return new Promise((resolve, reject) => {
        var request = indexedDB.open('questBank', 1);

        request.onsuccess = function(event) {
            var db = event.target.result;
            var transaction = db.transaction([storeName], 'readwrite');
            var objectStore = transaction.objectStore(storeName);
            var deleteRequest = objectStore.delete(id);

            deleteRequest.onsuccess = function(event) {
                resolve(event);
                return true;
            };

            deleteRequest.onerror = function(event) {
                reject(event.target.error);
            };
        };

        request.onerror = function(event) {
            console.error('Error opening database', event.target.error);
            reject(event.target.error);
        };

        return false;
    });
}