/*
    - Post a new diary entry for an user.
*/
export const postDiaryEntry = async (req, res) => {
    try {
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

/*
    - Update an existing diary entry for an user.
*/
export const updateDiaryEntry = async (req, res) => {
    try {
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

/*
    - Get diary history for an user.
*/
export const getDiaryHistory = async (req, res) => {
    try {
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

export default { postDiaryEntry, updateDiaryEntry, getDiaryHistory };
