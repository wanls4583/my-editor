import $ from 'jquery';

export default {
    showOpenDialog({ type, dir, title, multiple }) {
        return new Promise((resolve, reject) => {
            let $input = $(`<input type="file" 
            ${type === 'dir' ? 'nwdirectory' : ''}
            ${title ? 'nwdirectorydesc="' + title + '"' : ''}
            ${dir ? 'nwworkingdir="' + dir + '"' : ''}
            ${multiple ? 'multiple' : ''}
            >`);
            $input[0].files.append(new File("", ""));
            $input.on('change', (e) => {
                let files = $input[0].files;
                $input.remove();
                if (files.length) {
                    files = Array.prototype.slice.call(files);
                    files = multiple ? files : files[0];
                    resolve(files);
                } else {
                    reject();
                }
            });
            $(document.body).append($input);
            $input.hide();
            $input.click();
        });
    },
    showSaveDialog({ dir, title, filename }) {
        return new Promise((resolve, reject) => {
            let $input = $(`<input type="file" 
            ${title ? 'nwdirectorydesc="' + title + '"' : ''}
            ${dir ? 'nwworkingdir="' + dir + '"' : ''}
            nwsaveas="${filename || ''}"
            >`);
            $input[0].files.append(new File("", ""));
            $input.on('change', (e) => {
                let files = $input[0].files;
                $input.remove();
                if (files.length) {
                    resolve(files[0]);
                } else {
                    reject();
                }
            });
            $(document.body).append($input);
            $input.hide();
            $input.click();
        });
    }
}